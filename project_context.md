# Project Context — SEO Operating System

## Current Status
**Portfolio-ready.** All 13 phases complete + premium landing page with light/dark mode + signal network background + floating elements + welcome tour with mascot + Stripe billing (TEST MODE). 60 tests passing. README rewritten for recruiter/hiring-manager review, MIT LICENSE added, code quality tooling in place, 51 tests passing. Live demo at [https://seo-os.hf.space](https://seo-os.hf.space), repo at [https://github.com/waheed477/SEO-operator-system](https://github.com/waheed477/SEO-operator-system).

- Frontend theme fix completed: login/register/legal/static pages now use semantic Tailwind theme tokens instead of legacy hardcoded color utilities. Verified with a repo-wide search and frontend typecheck (`npx tsc --noEmit`).

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20 | LTS, native `--watch` flag for dev |
| Backend framework | Express 4 | Minimal, well-understood, single-process |
| ODM | Mongoose | Schema + validation on top of MongoDB |
| Auth | jsonwebtoken + bcrypt | Stateless JWT auth, bcrypt (12 rounds) |
| HTTP client | axios | Page fetching + HEAD link checks in the audit agent |
| HTML parsing | cheerio | Fast server-side jQuery-like parsing — no headless browser |
| Scheduler | node-cron | In-process cron for audit timeout watchdog + GSC daily sync — no Redis/BullMQ |
| Config | dotenv | 12-factor env var loading |
| CORS | cors | Cross-origin policy for frontend ↔ backend |
| AI | Groq API (via axios) | Ultra-fast LLM inference; all AI calls go through Groq |
| Encryption | Node.js crypto (AES-256-CBC) | Encrypt GSC refresh tokens at rest — no plaintext storage |
| Google OAuth2 | Google APIs | Official Search Console API via OAuth2 — the ONLY rank-tracking mechanism |
| Frontend | React 18+ + Vite 8 + TypeScript 7 | Fast DX, tree-shakeable bundles |
| Routing | React Router v6 | Client-side routing with protected route guard |
| Styling | Tailwind CSS v4 | Utility-first; design tokens in CSS `@theme` block |
| State | Zustand 5 | Auth store (in-memory JWT) + workspace store + toast store |
| Charts | Recharts | Composable chart primitives for position/clicks trend |
| Fonts | Space Grotesk (headings) + Inter (body) + Dancing Script (brand logo) | Confident/technical SaaS feel; script for signature wordmark |

---

## Architecture Decisions

- **No Puppeteer** — crawling uses axios + cheerio only (HF Spaces Docker compatibility)
- **No Redis / BullMQ** — all async work runs in-process; node-cron for scheduling
- **Single exposed port** — backend defaults to `PORT || 5001`. In local dev the default 5001 avoids collision with the Vite dev server on 5000; in production one process serves Vite build as static files from Express
- **Session Management** — Short-lived JWT access tokens (15m) and rotating refresh tokens (30d) stored in `httpOnly` cookies. Refresh tokens are bcrypt-hashed in MongoDB and revoked server-side on logout. See [Session Management](#session-management) below for the cookie scoping rules — they are load-bearing.
- **Backlink Agent omitted** — no free reliable data source; architecture allows plugging in a paid provider
- **Keyword difficulty is AI-estimated** — must be labeled honestly in UI
- **Rank tracking ONLY via Google Search Console API** — never scrape Google SERPs; no SERP scraping exists anywhere in the codebase
- **Competitor crawling is legitimate** — fetching publicly accessible pages via HTTP, same method as auditing the user's own site, same robots.txt respect and politeness constraints
- **Daily analysis cap (5 per site per 24h)** — prevents the tool from being used to hammer arbitrary domains at scale
- **GSC refresh tokens encrypted at rest** — AES-256-CBC with SITE_ENCRYPTION_KEY; never stored plaintext in MongoDB
- **Action Plan is the synthesis layer** — it pulls data from every previous phase, not just one source; this is the key differentiating feature
- **Notifications are workspace-scoped** — all workspace members see the same notifications; no per-user notification targeting
- **Error boundaries** — one failed component doesn't crash the whole page
- **Toast notifications** — every mutating action shows a success/error toast for immediate feedback
- **CORS is explicit** — `FRONTEND_URL` env var (comma-separated origins, no wildcard `*`). Required for credentialed JWT requests.
- **Server binds to 0.0.0.0** — required for containerized deployments (HF Spaces, Docker)
- **Startup sweep** — on boot, marks any jobs stuck in `running` from a previous crash as `failed` before the cron watchdog takes over

### Session Management

Login survives page refresh and browser restart until explicit logout. Access token 15m,
refresh token 30d, both `httpOnly` cookies; refresh tokens bcrypt-hashed in MongoDB and
rotated on every use.

**How a session re-hydrates on page load:** `AuthHydrator` (`App.tsx`) wraps the entire
router and blocks rendering (`if (loading) return <Loading/>`) until `GET /api/auth/me`
resolves. Because `ProtectedRoute` does not mount until that resolves, there is no
redirect-before-session-check race. If `me` 401s (access token expired), the API wrapper
transparently `POST`s `/api/auth/refresh`, stores the new token, and retries the original
request once. Only if refresh *also* fails is auth cleared.

#### Root cause of the persistence bug (2026-08-04)

The six usual suspects were each checked against the code and were **already correct** —
`secure: process.env.NODE_ENV === 'production'` (not hardcoded `true`), `sameSite: 'lax'`
(not `'strict'`), `credentials: 'include'` on every frontend call including `me`/`refresh`,
`credentials: true` in the backend CORS config, no cookie `domain` attribute, and
`AuthHydrator` correctly blocking on the async check. The real causes were different:

| # | What was actually wrong | Why the browser broke while tests passed | Fix |
|---|------------------------|------------------------------------------|-----|
| 1 | **Logout never reached the server.** `Sidebar.handleLogout` called `clearAuth()` + `navigate('/login')` only. `authApi.logout` existed but had **zero call sites** in the app. | Cookies are `httpOnly`, so JS cannot delete them. Local state cleared, cookies survived → the next page load re-hydrated via `me`/`refresh` and signed the user straight back in. "Logout doesn't stick" and "session persistence is broken" are the same defect seen from two sides. Supertest called `/logout` directly, so the missing wiring was invisible. | `handleLogout` is now `async` and awaits `authApi.logout()` in a `try/finally` before clearing local state and redirecting. |
| 2 | **Refresh cookie `Path` was `/api/auth/refresh`.** | Browsers only send a cookie to paths at or below its `Path` (RFC 6265 path-match), so the refresh cookie was **never sent to `/api/auth/logout`** — the server always saw `refreshToken === undefined` and silently skipped revocation, leaving a valid 30-day token in the DB. The test helper does `c.split(';')[0]`, which **strips `Path`/`SameSite`/`Secure`** and manually re-attaches the cookie to the exact refresh URL, so supertest could never catch this. | `Path` widened to `/api/auth` — still keeps the 30-day token off unrelated API calls, but now covers both `/refresh` and `/logout`. |
| 3 | **`clearCookie` attributes didn't match `cookie`.** `res.clearCookie('accessToken')` was called with no options, and the refresh clear passed only `path`. | A browser only removes a cookie when name/path/sameSite/secure all match; mismatched attributes are a silent no-op. Supertest just asserted the `Set-Cookie` header *string* looked cleared, never that a jar honored it. | Single `cookieAttributes(path)` helper is now the only source of cookie options, used by both set and clear paths. `clearAuthCookies()` also clears the legacy `/api/auth/refresh` path so sessions issued before this fix are properly terminated. |

**Also corrected:** `SecurityPage.tsx` and `PrivacyPolicy.tsx` still claimed "no persistent
auth cookies — JWT is in-memory only, users must re-login on page refresh." That was left
over from the pre-cookie implementation and directly contradicted the shipped behaviour.
Both now describe the actual `httpOnly` access + rotating refresh cookie model — the
project's stated rule is that legal/trust copy must be accurate to what the app does.

**Cross-site deploys:** `sameSite: 'lax'` is correct for local dev and for the Docker image
(one origin serves both API and frontend). If the frontend is ever hosted on a *different*
registrable domain than the API (e.g. Netlify + hf.space), browsers will not send a `Lax`
cookie on those cross-site requests and the session can never re-hydrate. Set
`COOKIE_CROSS_SITE=true` for that topology only — it switches the cookies to
`SameSite=None` and forces `Secure` (HTTPS-only, as browsers require).

**Testing caveat:** the backend integration tests cannot validate any of this. Supertest
has no cookie jar — it sends whatever string it's handed and ignores `Path`, `Domain`,
`SameSite`, and `Secure`. Real verification requires a browser (or a `tough-cookie` jar).
Do not treat green auth tests as evidence that session persistence works.

### OAuth Flow (Google Search Console)

Google OAuth requires **one fixed, pre-registered redirect URI** — it cannot contain a
dynamic path segment like a site id. So the callback is a single site-agnostic route
(`GET /api/gsc/callback`) and the site is carried through a signed, short-lived `state`
parameter instead of the URL path.

```
1. Frontend: user clicks "Connect Search Console"
2. Browser redirects to GET /api/sites/:id/gsc/connect?token=JWT
   → Server validates JWT
   → Signs a short-lived state token: jwt.sign({ siteId, purpose: 'gsc_oauth' }, JWT_SECRET, { expiresIn: '10m' })
   → Builds Google OAuth consent URL with redirect_uri = GOOGLE_REDIRECT_URI (fixed) + state
   → Redirects browser to Google
3. User consents in Google's UI
4. Google redirects to the FIXED URI GET /api/gsc/callback?code=xxx&state=yyy
   → Server verifies the `state` JWT FIRST (signature + expiry + purpose) — before any
     token exchange. Missing/invalid/expired state → 400, no exchange attempted.
   → Decodes siteId from the verified state
   → Exchanges code for access_token + refresh_token
   → Tests connection by querying Search Console API for the site domain prefix (https://<domain>/).
     If verification fails (403 Forbidden), aborts the connection flow, does not save to DB, and redirects browser to /app/sites/:id/rankings?gsc=error&msg=GSC_PROPERTY_NOT_VERIFIED.
   → Otherwise (success), encrypt(refresh_token) with AES-256-CBC + SITE_ENCRYPTION_KEY
   → Stores encrypted refresh token + gscConnected=true + gscSiteUrl in Site doc
   → Redirects browser to FRONTEND_URL + /app/sites/:id/rankings?gsc=connected
   → If the user denied consent, Google sends ?error=... instead of ?code — this is
     handled gracefully: redirects to the rankings page with ?gsc=error&msg=... (no crash).
5. For all future GSC API calls (e.g. manual sync):
   - decrypt(refresh_token) → refresh access_token → call GSC API
   - Standardizes GSC API errors (e.g., 403 Forbidden maps to `GSC_PROPERTY_NOT_VERIFIED`, invalid_grant/401 maps to `GSC_TOKEN_EXPIRED_OR_REVOKED`, 429 maps to `GSC_RATE_LIMIT_EXCEEDED`) to prevent raw technical leaks and display helpful instructional content.
```

**Redirect URI to register in Google Cloud Console** (Authorized redirect URIs):
- Local dev: `http://localhost:5001/api/gsc/callback`
- Production: `https://<your-space>.hf.space/api/gsc/callback`

### Async Job Pattern (fire-and-forget — reuse for all future agents)

Used for any long-running background task (audit crawl, competitor gap analysis, action plan generation):

```
1. Route handler creates a Mongoose doc with status: 'queued'
2. Handler responds immediately with 202 + { planId }
3. Handler calls runXxxAsync(docId, ...args) WITHOUT await — fire and forget
4. runXxxAsync():
     a. Updates doc to status: 'running', startedAt: now
     b. Runs the agent
     c. On success → status: 'done', completedAt, results
     d. On throw  → status: 'failed', completedAt, error: err.message
5. Frontend polls GET /latest every 3 s until status is 'done' or 'failed'
6. Cron watchdog (every 1 min) marks stuck jobs in 'running' > 5 min as 'failed'
```

This pattern works in a single process with no external queue. Copy it verbatim for future phases.

### Container Restart Safety

| Mechanism | When | What it does |
|-----------|------|-------------|
| **Startup sweep** | On boot (once) | Marks **ALL** jobs in `running` status as `failed` immediately. On boot we know with certainty the previous process is gone — any in-progress job is stuck. No cutoff is used (unlike the cron watchdog). |
| **Cron watchdog** | Every 1 minute | Marks any `running` job older than 5 minutes as `failed`. The 5-minute cutoff avoids killing genuinely-running jobs that are still making progress. |

Both cover: Audit, ContentGapReport, ActionPlan. Together, these guarantee no job is ever permanently stuck in `running` after a container restart. The startup sweep provides instant recovery; the cron watchdog is a continuous safety net for jobs that hang during normal operation.

### Crawl Constraints (architectural, not incidental)

- **Max 20 pages per crawl run** — hard cap for hosting resource limits
- **400 ms polite delay** between every HTTP request
- **10 s page-fetch timeout**, **5 s HEAD timeout** for broken-link checks
- **Max 50 unique internal links HEAD-checked** per audit
- **5-minute timeout** — cron watchdog marks stuck jobs as failed
- robots.txt respected; fetch failure treated as "not found" (crawl continues)
- Transparent User-Agent: `SEO-OS-Audit/1.0 (Technical SEO auditing tool)`
- **Max 5 gap analyses per site per 24 hours** — deliberate safety/politeness cap

### GSC Sync (daily cron job)

- Runs at 6:00 AM UTC every day
- Syncs Search Analytics for all sites with gscConnected=true
- Staggers with 2-second delay between sites to avoid Google API rate limits
- Upserts RankSnapshot documents (deduped by siteId + queryText + page + date)
- On sync failure, creates a `gsc_sync_error` notification for the workspace

### Action Plan Data Gathering

The actionPlanAgent gathers **condensed summaries** (not full raw data) from:

1. **Latest Audit** — issue counts per category (not full URL lists)
2. **Latest ContentGapReport** — top 5 gaps per competitor report
3. **RankSnapshot trend** — position trend (improving/declining), top 10 queries
4. **Keyword clusters** — cluster names, counts, average difficulty

This is sent to Groq as a single structured prompt, asking for 8–15 prioritized, data-specific action items.

### Notification System

Notifications are workspace-scoped (not per-user). When an async job completes, a notification is created for the workspace. All workspace members see the same notifications. The bell icon in the header shows the unread count and a dropdown panel lists recent notifications. Clicking a notification marks it as read and navigates to the relevant site/report.

**Notification triggers:**

- `audit_complete` — When an Audit's status becomes 'done'
- `action_plan_ready` — When an ActionPlan finishes generating
- `gsc_sync_error` — When the GSC daily sync cron fails for a site
- `competitor_analysis_complete` — When a Competitor analysis completes

### Billing & Subscriptions (TEST MODE)

**Stripe integration in TEST MODE — no real payments are processed.** This demonstrates a complete subscription billing flow (Checkout, webhooks, plan lifecycle) without processing real payments.

**Plan model (Workspace fields):**

| Field | Type | Values | Default | Purpose |
|-------|------|--------|---------|---------|
| `plan` | String enum | `'free'`, `'pro'` | `'free'` | Current plan tier |
| `planStatus` | String enum | `'active'`, `'past_due'`, `'canceled'` | `'active'` | Distinguishes "on free by choice" from "was pro, payment failed" |
| `stripeCustomerId` | String, nullable | `cus_*` or null | null | Stripe Customer ID linked to this workspace |
| `stripeSubscriptionId` | String, nullable | `sub_*` or null | null | Stripe Subscription ID for the active subscription |

**Free tier limit:**
- Workspaces on `plan='free'` can have a **maximum of 1 Site document**
- Enforced server-side in `POST /api/sites` — if `workspace.plan === 'free'` and `Site.countDocuments({ workspaceId }) >= 1`, returns 403 with `{ success: false, error: 'FREE_TIER_LIMIT_REACHED', data: { limit: 1, current: N } }`
- The limit lives in a single `FREE_TIER_SITE_LIMIT` constant (`routes/sites.js`, mirrored in `services/stripeService.js` and the frontend `Sites.tsx`) — never a magic number inline
- Never enforced client-side only — the server is the authority
- Pro plan workspaces have no site limit

**Checkout flow:**
1. Frontend calls `POST /api/workspaces/:id/create-checkout-session` (auth + membership required)
2. `stripeService.createCheckoutSession(workspaceId, userEmail)`:
   - If workspace has no `stripeCustomerId`, creates a Stripe Customer first (linked to user's email), saves the ID
   - Creates a Stripe Checkout Session in subscription mode using `STRIPE_PRICE_ID_PRO`
   - `success_url` → `{FRONTEND_URL}/app/billing?session_id={CHECKOUT_SESSION_ID}&success=true`
   - `cancel_url` → `{FRONTEND_URL}/app/billing?canceled=true`
   - `metadata: { workspaceId }` for webhook identification
3. Returns `{ success: true, data: { url } }` — frontend redirects browser to this URL

**Webhook handler (POST /api/webhooks/stripe):**
- Mounted BEFORE `express.json()` — captures raw body for Stripe signature verification
- Verifies every event with `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`
- Rejects unverified events with 400
- Responds 200 quickly to every event (even unhandled) so Stripe doesn't retry

| Event Type | Action |
|------------|--------|
| `checkout.session.completed` | Read `metadata.workspaceId`, save `subscription.id` as `stripeSubscriptionId`, set `plan='pro'`, `planStatus='active'`. Create `plan_upgraded` notification. |
| `customer.subscription.updated` | If `status='active'`: ensure `plan='pro'`/`planStatus='active'`. If `status='past_due'`: set `planStatus='past_due'` (keep `plan='pro'` — grace period), create `payment_failed` notification. |
| `customer.subscription.deleted` | Set `plan='free'`, `planStatus='canceled'`, `stripeSubscriptionId=null`. Create `plan_downgraded` notification. Does NOT delete existing sites/audits/data — only blocks NEW site creation. |
| `invoice.payment_failed` | Create `payment_failed` notification (avoid duplicate if `subscription.updated` already handled the same transition). |

**Billing Portal:**
- `POST /api/workspaces/:id/create-portal-session` — creates a Stripe Billing Portal session for the workspace's `stripeCustomerId`
- Returns portal URL — lets users manage payment method, invoices, and cancellation without building that UI

**Frontend integration:**
- `BillingPage.tsx` — shows current plan/status for each workspace, "Upgrade to Pro" (free) or "Manage Billing" (pro) buttons, polls for plan upgrade after successful checkout
- `UpgradeModal.tsx` — polished upgrade modal shown when 403 `FREE_TIER_LIMIT_REACHED` error is hit adding a site, with value explanation and "Upgrade to Pro" button
- Sites page shows "Sites used: X / 1" indicator for free-plan workspaces (or "PRO" badge for pro)
- Checkout success redirect handled with polling (webhook may arrive a few seconds after redirect)
- Test mode notice displayed in billing page

**New notification types:** `plan_upgraded`, `plan_downgraded`, `payment_failed`

**New environment variables:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes (for billing) | Stripe test-mode secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes (for billing) | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_PRO` | Yes (for billing) | Stripe Price ID for the Pro plan (`price_...`) |

**Testing locally with Stripe CLI:**
1. Install Stripe CLI: `stripe login`
2. Forward webhook events: `stripe listen --forward-to localhost:5001/api/webhooks/stripe`
3. This prints a `whsec_...` value — use it as `STRIPE_WEBHOOK_SECRET` in your `.env`
4. In Stripe Dashboard (Test mode → Developers → Webhooks), register endpoint: `https://your-domain/api/webhooks/stripe` with events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Trigger test events: `stripe trigger checkout.session.completed`

---

## Data Models

| Model | Key fields |
|-------|-----------|
| `User` | email (unique), passwordHash, name, createdAt |
| `Workspace` | name, ownerId (→ User), members[{userId, role}], createdAt |
| `Site` | workspaceId (→ Workspace), domain (normalized), gscConnected (bool), gscRefreshToken (AES-encrypted), gscSiteUrl, createdAt |
| `Audit` | siteId (→ Site), status (queued/running/done/failed), startedAt, completedAt, error, results{pagesCrawled, technical{...}} |
| `Keyword` | siteId (→ Site), keyword, cluster, intent, difficultyEstimate (0–100, AI-estimated), createdAt |
| `Competitor` | workspaceId, siteId (→ Site), domain (normalized), lastCrawledAt, createdAt |
| `ContentGapReport` | siteId (→ Site), competitorId (→ Competitor), status (queued/running/done/failed), startedAt, completedAt, error, gaps[{topic, competitorHasIt, userHasIt, opportunity}], generatedAt, createdAt |
| `RankSnapshot` | siteId (→ Site), queryText, page, avgPosition, clicks, impressions, ctr, date (upsert key: siteId+queryText+page+date) |
| `ActionPlan` | siteId (→ Site), status (queued/running/done/failed), startedAt, completedAt, error, items[{priority, agent, title, description, status}], summary (AI-written), generatedAt, createdAt |
| `Notification` | workspaceId (→ Workspace), type, message, read (bool), relatedSiteId (→ Site, nullable), createdAt; TTL auto-delete after 30 days |

---

## AI Agents

| Agent | Purpose | Execution |
|-------|---------|-----------|
| `technicalSeoAgent` | Crawl domain, check meta tags, headings, alt text, robots, sitemap, broken links | Async fire-and-forget (long crawl) |
| `keywordResearchAgent` | Expand seed keywords, cluster into topic groups, assign intent, estimate difficulty | Synchronous (Groq is fast — ~2–5 s) |
| `contentSeoAgent` | Analyze page content for keyword usage, structure, readability; suggest improvements | Synchronous (Groq is fast — ~2–5 s) |
| `competitorAgent` | Crawl competitor domain, extract per-page content summaries, Groq gap analysis | Async fire-and-forget (crawling + Groq — ~2–5 min) |
| `actionPlanAgent` | Synthesize data from all previous phases into prioritized, actionable plan | Async fire-and-forget (multi-source gathering + Groq — ~10–30 s) |

---

## Services

| Service | Purpose |
|---------|---------|
| `gscService` | Google OAuth2 flow (getAuthUrl, exchangeCode), access token refresh, Search Analytics retrieval — all official API, no SERP scraping |
| `notify` | createNotification(workspaceId, type, message, relatedSiteId) — workspace-scoped notification; non-critical (logs errors but doesn't throw) |

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Server + DB status |
| POST | `/api/auth/register` | — | Register, returns JWT |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/workspaces` | ✅ | Create workspace |
| GET | `/api/workspaces` | ✅ | List user's workspaces |
| POST | `/api/workspaces/:id/members` | ✅ owner/admin | Add member |
| POST | `/api/sites` | ✅ + member | Add site to workspace |
| GET | `/api/sites?workspaceId=` | ✅ + member | List sites |
| GET | `/api/sites/:id` | ✅ + member | Get one site |
| POST | `/api/sites/:id/audit` | ✅ + member | Start audit (async, returns 202 + auditId) |
| GET | `/api/sites/:id/audit/latest` | ✅ + member | Latest audit for polling |
| POST | `/api/sites/:id/keywords` | ✅ + member | Run keyword research (sync), save results |
| GET | `/api/sites/:id/keywords/clusters` | ✅ + member | Get keywords grouped by cluster |
| POST | `/api/sites/:id/content-review` | ✅ + member | Run content SEO review (sync) |
| POST | `/api/competitors` | ✅ + member | Add competitor domain |
| GET | `/api/competitors?siteId=` | ✅ + member | List competitors for a site |
| POST | `/api/competitors/:id/analyze` | ✅ + member | Start gap analysis (async, returns 202 + reportId) |
| GET | `/api/competitors/:id/report/latest` | ✅ + member | Latest gap report for polling |
| GET | `/api/sites/:id/gsc/connect` | JWT in query param | Redirect to Google OAuth consent screen |
| GET | `/api/gsc/callback` | — (Google redirect) | OAuth callback (single fixed URI) — verifies signed `state`, decodes siteId, exchanges code, stores encrypted refresh token |
| GET | `/api/sites/:id/rankings?days=30` | ✅ + member | Aggregated GSC ranking data |
| POST | `/api/sites/:id/gsc/sync` | ✅ + member | Manually trigger GSC data sync |
| POST | `/api/sites/:id/action-plan` | ✅ + member | Generate action plan (async, returns 202 + planId) |
| GET | `/api/sites/:id/action-plan/latest` | ✅ + member | Latest action plan for polling |
| PATCH | `/api/sites/:id/action-plan/items/:itemId` | ✅ + member | Update action item status |
| GET | `/api/notifications?workspaceId=` | ✅ + member | List workspace notifications |
| PATCH | `/api/notifications/:id/read` | ✅ + member | Mark notification as read |
| PATCH | `/api/notifications/read-all` | ✅ + member | Mark all workspace notifications as read |
| POST | `/api/workspaces/:id/create-checkout-session` | ✅ + member | Create Stripe Checkout Session, returns `{ url }` |
| POST | `/api/workspaces/:id/create-portal-session` | ✅ + member | Create Stripe Billing Portal Session, returns `{ url }` |
| POST | `/api/webhooks/stripe` | — (Stripe) | Webhook handler — raw body, signature verification | `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

---

## Frontend Components (Reusable)

| Component | Purpose |
|-----------|---------|
| `Badge` | Shared semantic badge/pill component with error, warning, success, info, and neutral variants for light/dark mode contrast |
| `StatusBanner` | Shared async state banner (queued/running/failed) for data fetching processes like audits or analysis |
| `Logo` | Brand logo with two variants (full/compact) and light/dark theme — uses Dancing Script signature wordmark |
| `Footer` | Professional 4-column footer with brand, product links, company links, and legal links — appears on all pages |
| `LegalLayout` | Shared wrapper for static legal/trust pages — navy background, logo, back navigation, consistent typography |
| `EmptyState` | Reusable empty state with icon, title, description, and optional CTA button |
| `LoadingSkeleton` | Reusable shimmer skeleton rows (configurable count and height) |
| `ErrorBoundary` | React error boundary wrapping the main content area |
| `ToastContainer` | Toast notification system (success/error/info) — auto-dismisses after 4 seconds |
| `NotificationBell` | Bell icon in header showing unread count badge, dropdown panel with notification list |
| `LandingBackground` | Signal network SVG + floating icons + floating data-chip labels for the landing page hero background |
| `TourMascot` | Cheerful flat-design cartoon boy mascot — inline SVG, theme-aware colors, idle animations (bob/blink/wave) |
| `WelcomeTour` | First-visit overlay with mascot + typing opening line + 4-step stacked card tour — localStorage flag, keyboard nav, focus trap, reduced-motion support |
| `UpgradeModal` | Polished upgrade modal shown when free tier site limit is reached — value explanation + "Upgrade to Pro" button |
| `BillingPage` | Billing & Plans page — shows plan/status per workspace, Upgrade/Manage Billing buttons, Stripe checkout success polling |

---

## Branding

### Logo Component

**Location:** `frontend/src/components/Logo.tsx`

A signature-style wordmark using **Dancing Script** (700 weight, loaded via `@fontsource/dancing-script`) paired with a clean sans-serif tagline in Inter.

**Variants:**

| Variant | Usage | Description |
|---------|-------|-------------|
| `<Logo variant="full" theme="dark" />` | Login & Register pages, marketing/empty states | Signature wordmark "SEO·OS" + tagline "AI SEO Platform" underneath |
| `<Logo variant="compact" theme="dark" />` | Sidebar, header navbar | Signature wordmark only, no tagline — sized for ~32-40px height |

**Props:**

| Prop | Values | Default | Description |
|------|--------|---------|-------------|
| `variant` | `'full'` \| `'compact'` | `'full'` | Full = signature + tagline; Compact = signature only |
| `theme` | `'light'` \| `'dark'` | `'dark'` | Swaps stroke colors: navy on light backgrounds, cream on dark backgrounds |
| `className` | string | `''` | Additional CSS classes |

**Colors (theme palette only — no new colors):**

| Element | Color | Hex |
|---------|-------|-----|
| Signature strokes (dark bg) | Cream | `#F3E4C9` |
| Signature strokes (light bg) | Navy | `#0A2947` |
| Clay accent (dot + underline flourish) | Clay | `#8B5E3C` |
| Tagline text (dark bg) | Sage @ 70% | `#D3D4C0b3` |
| Tagline text (light bg) | Navy @ 60% | `#0A294799` |

**Usage in the app:**

- **Sidebar** (`Sidebar.tsx`): `<Logo variant="compact" theme="dark" />`
- **Header bar** (`Shell.tsx`): `<Logo variant="compact" theme="dark" />`
- **Login page** (`Login.tsx`): `<Logo variant="full" theme="dark" className="mb-8" />`
- **Register page** (`Register.tsx`): `<Logo variant="full" theme="dark" className="mb-8" />`

### Favicon

- **SVG favicon:** `frontend/public/favicon.svg` — script "S" monogram on navy background with clay underline accent
- **PNG fallbacks:** `favicon-32x32.png`, `favicon-16x16.png` — auto-generated from the SVG
- **HTML references:** Set in `frontend/index.html` with `<link rel="icon">` for SVG + both PNG sizes

---

## Legal & Footer

### Legal/Trust Pages

Five static content pages, accessible without authentication. All use the `LegalLayout` component (`frontend/src/components/LegalLayout.tsx`) for consistent navy/cream styling.

| Route | Page | Content |
|-------|------|---------|
| `/privacy-policy` | Privacy Policy | What data we collect (account info, site URLs, GSC tokens), how it's used, no data selling, deletion requests, cookie/local-storage disclosure |
| `/terms-of-service` | Terms of Service | Acceptable use (only audit domains you own/have permission), account responsibilities, AI content disclaimer (advisory not guaranteed), liability limitations, termination conditions |
| `/security` | Security | Honest description of actual practices — bcrypt hashing, JWT auth, AES-256-CBC encrypted GSC tokens, no Puppeteer, robots.txt respect, rate-limited crawler, no SERP scraping. Explicitly lists what we don't claim (no SOC2/ISO27001/pen test/GDPR officer) |
| `/cookie-policy` | Cookie Policy | Essential-only cookies (JWT in memory, not a cookie), no third-party tracking, Google Fonts disclosure |
| `/contact` | Contact | Support email (mailto link), security reporting, data deletion requests, GitHub link |

**Key principle:** All legal text is genuinely accurate to what this specific app does. No generic boilerplate. No fabricated compliance claims.

### Footer Component

**Location:** `frontend/src/components/Footer.tsx`

4-column responsive layout (stacked on mobile):

| Column | Content |
|--------|---------|
| 1 — Brand | `<Logo variant="full" theme="dark" />` + one-line product tagline |
| 2 — Product | Links to Command Center, Audits, Keywords, Competitors, Action Plan |
| 3 — Company | Contact link + About/Blog (greyed out, "coming soon") |
| 4 — Legal | Privacy Policy, Terms of Service, Security, Cookie Policy |

**Bottom bar:** `© {current year} SEO Operating System. All rights reserved.` (left) + GitHub icon link (right).

### Footer Placement

| Page | Footer? | How |
|------|---------|-----|
| Login, Register | ✅ | `<Footer />` at bottom of the page's flex column |
| All authenticated pages (Shell) | ❌ | No `<Footer />`; authenticated pages use the top navbar in `Shell.tsx` instead |
| Legal pages (Privacy, Terms, Security, Cookie, Contact) | ❌ | Legal pages have their own `LegalLayout` with a "Back to app" link instead |

---

## Data Integrity

**No mock, dummy, or placeholder data exists in active code paths.** The entire application runs against real data flows only.

### Audit Results (2026-07-31)

| Check | Result |
|-------|--------|
| Hardcoded sample arrays in backend routes/services | ✅ None found — all data comes from MongoDB or API calls |
| Seed/fixture scripts | ✅ None exist — no seed scripts, no auto-population on server start |
| Placeholder text in components ("Lorem ipsum", "Sample Site", etc.) | ✅ None found — all form placeholders are functional hints ("you@example.com", "example.com") |
| Fake-data fallback logic in frontend | ✅ None found — all pages show real empty states (EmptyState component) when no data exists |
| Hardcoded API keys/tokens in code | ✅ None found — all secrets in .env files (excluded from git) |
| Console.log printing debug/mock data | ✅ None found — all console.log in backend are operational logging (startup, cron, audit completion) |
| Stale scaffolding UI | ✅ Removed — Dashboard.tsx was entirely Phase 0 scaffolding with hardcoded "Phase 0 — Scaffold" badge, StatusCard, RoadmapTable, PalettePreview, and EnvVarPanel. All replaced with real Command Center that fetches workspace/site data from API. |

### Items explicitly kept

| Item | Location | Why it's kept |
|------|----------|---------------|
| `DashboardMock` in LandingPage | `frontend/src/pages/LandingPage.tsx` | This is a marketing product visualization on a public landing page — not a data path. It shows a stylized preview of what the audit dashboard looks like. Standard practice (like Figma hero shots on SaaS landing pages). Explicitly labeled as a mock, not confused with real data. |
| Mock data in test files | `frontend/src/pages/*.test.tsx`, `backend/tests/**` | Test files use mock data by design — they're isolated and never run in production. All API calls are mocked via `vi.mock`/`jest.mock`. |
| Placeholder values in `.env.example` | `backend/.env.example`, `frontend/.env.example` | Template files with `replace-with-` and `gsk_...` — not real secrets, just documentation. |

### Deleted in this pass

| File | What was removed |
|------|-----------------|
| `frontend/src/components/ui/StatusCard.tsx` | Entire component — only used by old Dashboard scaffolding |
| `frontend/src/components/ui/RoadmapTable.tsx` | Entire component — hardcoded PHASES array from Phase 0, completely stale |
| `frontend/src/components/ui/PalettePreview.tsx` | Entire component — design token debug tool, only used by old Dashboard |
| `frontend/src/pages/Dashboard.tsx` | Entire rewrite — replaced Phase 0 scaffolding with real Command Center that fetches workspaces and sites from API |

### Dashboard (Command Center) — Replaced

The old Dashboard was entirely Phase 0 scaffolding with:
- Hardcoded "Phase 0 — Scaffold" badge
- StatusCard with hardcoded values ("Express + MongoDB", "Awaiting GROQ_API_KEY")
- RoadmapTable with hardcoded PHASES array (Phase 0 "complete", Phase 1 "next")
- PalettePreview showing design token swatches
- EnvVarPanel with hardcoded `set: false` values and "Set these in Replit Secrets" message

The new Dashboard (Command Center) fetches real data:
- Workspace count from `workspaceApi.list()`
- Site count from `siteApi.list()`
- GSC-connected count from site data
- Lists real workspaces with navigation to sites
- Shows EmptyState when no workspaces exist

---

## Pre-Deploy Verification (2026-07-31)

### Fixes Applied

| # | What was broken | Why it would fail | What was fixed |
|---|----------------|-------------------|----------------|
| 1 | No root `package.json` — user had to run `cd backend && npm ...` and `cd frontend && npm ...` separately | `npm run dev` from root would fail with "no such file" | Created root `package.json` with `install:all` and `dev` scripts using `concurrently` |
| 2 | `JWT_SECRET`, `GROQ_API_KEY`, `SITE_ENCRYPTION_KEY` had no startup validation | Server would start, then crash with cryptic errors when auth/agent routes were hit | Added startup validation block that checks all 4 required env vars and exits with a clear error message listing which ones are missing |
| 3 | `backend/.env.example` was missing `NODE_ENV` and had `MONGO_URI` pointing to Atlas only | Local dev user would have to guess the local MongoDB URI format | Updated `.env.example` with local MongoDB URI, added `NODE_ENV` documentation, added "Required env vars" header comment |
| 4 | Stray `}` in `server/index.js` after edit | ESLint parse error, server would crash | Removed orphaned closing brace from old `if/else` block |

### 12-Point Checklist

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | Root-level `package.json` with `dev` + `install:all` | ✅ PASS | Created with `concurrently`. Both scripts tested and working. |
| 2 | Environment variables | ✅ PASS | All 4 required vars (`MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `SITE_ENCRYPTION_KEY`) validated at startup with clear error + exit. No hardcoded fallback values for secrets. `.env.example` updated with all 10 vars referenced in code. |
| 3 | Frontend/backend URL wiring | ✅ PASS | All API calls go through `api.ts` using `VITE_API_URL || '/api'`. No hardcoded `localhost:5000` or bare `/api/` fetch calls. Vite proxy forwards `/api` to `localhost:5001`. |
| 4 | CORS | ✅ PASS | Backend uses `FRONTEND_URL` env var (defaults to `http://localhost:5000` in dev). In production, set to deployed frontend URL. Supports comma-separated list. No wildcard `*`. |
| 5 | Port conflicts | ✅ PASS | Backend: `PORT` env var (default 5001). Frontend: hardcoded 5000 in `vite.config.ts`. No collision. Both configurable. |
| 6 | Database connection | ✅ PASS | Missing `MONGO_URI` → clear error + `process.exit(1)`. Connection failure → `process.exit(1)` (server never runs partially). Production disconnect → `process.exit(1)` for orchestrator restart. |
| 7 | Route/module wiring | ✅ PASS | All 7 route files mounted in `server/index.js`: auth, workspaces, sites, competitors, gsc, actionPlans, notifications. No orphaned route files. |
| 8 | Cron jobs | ✅ PASS | All 3 jobs (auditTimeout, gscDailySync, startupSweep) initialize without throwing on empty collections. They only run after MongoDB connects successfully. |
| 9 | Production build | ✅ PASS | `npm run build` completes with zero errors. `tsc` passes. Only warning: chunk size > 500KB (informational, not a build error). |
| 10 | Test suite | ✅ PASS | 35 backend tests + 16 frontend tests = 51 total. All green. No skipped or broken tests. |
| 11 | Lint | ✅ PASS | ESLint 0 errors, 0 warnings in both backend and frontend. |
| 12 | Docker | ⚠️ NOT TESTED | Docker not available in sandbox. Dockerfile reviewed — all source directories covered, no missing COPY directives. User must test locally with `docker build -t seo-os .` |

---

## Known Fixed Bugs (2026-08-03)

The following bugs were **reproduced, diagnosed from real stack traces, fixed, and verified** with a live server run. Do not re-investigate — the root cause is documented here.

### Bug 1 — POST /api/sites/:id/keywords returned 500

**Reproduction:** `POST /api/sites/:id/keywords` with `{ seedKeywords: [...] }` — 500 because `Site.create()` itself threw before the keyword agent was called.

**Real stack trace (captured from running server):**
```
TypeError: next is not a function
    at model.<anonymous> (backend/models/Site.js:28:3)
    at Kareem.execPre (node_modules/kareem/index.js:59:39)
    at model._execDocumentPreHooks (node_modules/mongoose/lib/document.js:3293:29)
    ...
```

**Root cause:** Mongoose 9.x changed how synchronous `pre('save')` hooks work. The old callback style `pre('save', function(next) { ...; next(); })` no longer passes `next` as a valid callable — `next` is `undefined` at the call site inside kareem's synchronous hook path. This affects any model that uses the callback style for synchronous pre hooks.

**Fix:** Converted `Site.js` pre-save hook from callback style to `async function ()` (no `next` parameter). Mongoose 8+/9.x honors async pre hooks correctly.

**File changed:** [`models/Site.js`](file:///d:/r2/seo-operator/backend/models/Site.js) — line 26: `pre('save', function(next)` → `pre('save', async function()`, removed `next()` call.

---

### Bug 2 — POST /api/sites/:id/content-review returned 500

**Root cause:** Same as Bug 1 — the route guard (`requireSiteAccess`) calls `Site.findById()` which was fine, but **the site itself could not be created** due to the Bug 1 pre-hook crash. Once Bug 1 was fixed, content review worked correctly — the `contentSeoAgent` Groq JSON handling was already robust (handles both string and object responses, has try/catch around parsing, validates the `overallAssessment`/`suggestions`/`estimatedReadability` fields with fallbacks).

**Verified:** After the Site.js fix, content review returns a clean 200 with `{ overallAssessment, suggestions, estimatedReadability }` from Groq.

---

### Bug 3 — POST /api/competitors returned 500

**Real stack trace (captured from running server):**
```
TypeError: next is not a function
    at model.<anonymous> (backend/models/Competitor.js:23:3)
    at Kareem.execPre (node_modules/kareem/index.js:59:39)
    ...
```

**Root cause:** Same Mongoose 9.x issue — `Competitor.js` also had a callback-style `pre('save', function(next) { ...; next(); })` hook.

**Fix:** Converted `Competitor.js` pre-save hook from callback style to `async function ()`.

**File changed:** [`models/Competitor.js`](file:///d:/r2/seo-operator/backend/models/Competitor.js) — line 15: `pre('save', function(next)` → `pre('save', async function()`, removed `next()` call.

**Note on domain regex:** The regex `DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i` correctly accepts `hdhub4u.ec` (`.ec` is a 2-char TLD, matching `[a-z]{2,}`). The domain regex was NOT the issue.

---

### Bonus: Test failure fixed — duplicate domain check order

**Test:** `POST /api/sites — rejects duplicate domain in same workspace` was failing with received 403 instead of expected 409.

**Root cause:** The duplicate-domain check ran **after** the free-tier limit check. On a free-plan workspace that already has 1 site, adding the same domain again returned 403 (FREE_TIER_LIMIT_REACHED) instead of 409 (duplicate). The UX and API contract were wrong.

**Fix:** Moved the duplicate-domain lookup in `routes/sites.js` to run **before** the free-tier check. A duplicate should always return 409 regardless of plan.

**File changed:** [`routes/sites.js`](file:///d:/r2/seo-operator/backend/routes/sites.js) — `Site.findOne({ workspaceId, domain: normalized })` now runs before the free-tier `Site.countDocuments()` check.

---

### GSC Token Flow (item 8) — Verified Working

**Tested:** `GET /api/sites/:id/gsc/connect?token=<JWT>` was called with a real JWT.

**Result:** Server returned HTTP 302 with `Location: https://accounts.google.com/o/oauth2/v2/auth?...&state=<signed-JWT>`. The state parameter was decoded and confirmed to contain a valid, short-lived JWT (`purpose: 'gsc_oauth'`, `siteId`, 10-minute expiry) signed with JWT_SECRET. The token in the query string at the moment `gsc.js` (server) verifies it is **a valid, non-empty, verifiable JWT** — confirmed.

---

### Action Plan End-to-End (item 9) — Verified Working

**Tested:** A fresh site with NO prior audit/keywords/competitor data.
- `POST /api/sites/:id/action-plan` → 202, `{ planId }`
- Polled `GET /api/sites/:id/action-plan/latest` — first poll returned `status: 'done'` (completed in ~2.7 seconds)
- Result: 8 prioritized action items generated from keyword data, `summary` field present, graceful fallback for missing audit/competitor data works as designed.

---

### Test Suite Status After Fixes (2026-08-03)

| Suite | Tests | Result |
|-------|-------|--------|
| `tests/unit/authMiddleware.test.js` | 6 | ✅ All pass |
| `tests/unit/validation.test.js` | 16 | ✅ All pass |
| `tests/integration/auth.test.js` | 9 | ✅ All pass |
| `tests/integration/sites.test.js` | 6 | ✅ All pass (was 1 failing before fix) |
| `tests/integration/billing.test.js` | 9 | ✅ All pass |
| `tests/integration/gsc.test.js` | 4 | ✅ All pass |
| **Total** | **50** | **✅ 50/50 pass** |

Frontend: `npx tsc --noEmit` — **0 errors, 0 warnings** ✅

---



### Linting & Formatting

| Layer | Tool | Config | Scripts |
|-------|------|--------|---------|
| Backend | ESLint 10 + Prettier | `backend/eslint.config.cjs`, `backend/.prettierrc` | `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check` |
| Frontend | ESLint 10 + Prettier | `frontend/eslint.config.cjs`, `frontend/.prettierrc` | `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check` |
| Root | `.editorconfig` | Consistent indentation across editors | — |

**Backend ESLint rules:** `prefer-const`, `no-var`, `eqeqeq`, `curly`, `no-debugger`, `no-empty` (no empty catch), `no-cond-assign`, `no-template-curly-in-string`, `no-async-promise-executor`, `no-useless-return`, `no-unused-vars` (warn, underscore-prefixed ignored).

**Frontend ESLint note:** `@typescript-eslint` doesn't support TypeScript 7.x yet (as of July 2025). ESLint checks config files only; TypeScript's own compiler (`tsc`) handles type-checking for `.ts`/`.tsx` files. Prettier handles formatting. When TS 7 support arrives, the TypeScript-specific rules can be re-enabled.

**Prettier config (both):** Semi, single quotes, trailing commas, 120 char print width, 2-space indent, LF line endings. Frontend also uses `prettier-plugin-tailwindcss` for class sorting.

**Root-level scripts** — the root `package.json` has been removed. Neither backend nor frontend depends on it. Each project is installed and run independently from its own directory. Run `npm` commands directly in `backend/` or `frontend/`.

### Code Cleanup Performed

- **No leftover console.log statements** — all `console.log/error/warn` in the backend are intentional server-side logging (startup, cron, audit completion, error handling). No debug leftovers.
- **No env var exposure in error responses** — error responses never include `process.env` values, secrets, or API keys.
- **Consistent error handling** — all route handlers use try/catch with `res.status(500).json({ success: false, error: '...' })`. No unhandled promise rejections.
- **Unused imports removed** — `technicalSeoAgent` (unused in competitors route), `encrypt` (unused in gscService), `validStatuses` (unused in actionPlanAgent), `mongoose` (unused in auth integration test), and test file unused model imports were all cleaned up.
- **JSDoc enhanced** on all 5 agent files — each now has a clear `@module` tag, description of what it does, inputs/outputs, and `@param`/`@returns` on the main `run()` function.

### Folder Structure

```
seo-operator/
├── backend/                          # Express + Mongoose API server
│   ├── server/                       # App entry (index.js)
│   ├── routes/                       # Express route handlers
│   ├── models/                       # Mongoose schemas (10 models)
│   ├── services/agents/              # AI agents (5 agents)
│   ├── services/gscService.js        # Google Search Console OAuth + API
│   ├── jobs/                         # Cron watchdog, GSC daily sync, startup sweep
│   ├── middleware/                    # JWT auth middleware
│   ├── lib/                          # Encryption, notifications
│   └── tests/                        # Jest unit + integration tests

├── frontend/                         # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/                      # Centralized fetch wrapper
│   │   ├── pages/                    # Route page components + test files
│   │   ├── components/               # Logo, Footer, LegalLayout, UI components
│   │   ├── store/                    # Zustand stores (auth, workspace, toast)
│   │   ├── App.tsx                   # Routes (landing + /app/* protected)
│   │   ├── main.tsx                  # Entry point
│   │   └── index.css                 # Tailwind v4 theme tokens
│   └── vite.config.ts
```

---

## Testing

### Backend (Jest + Supertest + mongodb-memory-server)

**How to run:** `cd backend && npm test`

| Test suite | Type | What's covered | Count |
|-----------|------|----------------|-------|
| `tests/unit/authMiddleware.test.js` | Unit | JWT auth middleware: valid token, missing token, expired token, wrong secret, malformed token | 6 |
| `tests/unit/validation.test.js` | Unit | Input validation on auth routes (email, password, name), workspace routes (name, email, role), site routes (workspaceId, domain), unauthenticated requests | 16 |
| `tests/integration/auth.test.js` | Integration | POST /api/auth/register (success, duplicate email, lowercase normalisation), POST /api/auth/login (success, wrong password, non-existent email, case-insensitive) | 7 |
| `tests/integration/sites.test.js` | Integration | POST /api/sites (create, domain normalisation, duplicate rejection), GET /api/sites/:id/audit/latest (404 when none, returns completed audit, 404 for fake site) | 6 |

**Total: 35 backend tests**

- All external calls are mocked: Groq API, PageSpeed API, GSC API — never make real network requests during test runs
- Uses `mongodb-memory-server` for an isolated in-memory MongoDB — tests never touch real data
- The `technicalSeoAgent.run()` is mocked in integration tests so audits complete instantly
- A testable Express app (`tests/app.js`) is used instead of `server/index.js` — it has the same routes but no `app.listen()` or auto-connect

### Frontend (Vitest + React Testing Library)

**How to run:** `cd frontend && npm test`

| Test suite | What's covered | Count |
|-----------|----------------|-------|
| `src/pages/Login.test.tsx` | Form rendering (email/password inputs, submit button, register link), error message display on failed login, navigation on successful login | 5 |
| `src/pages/Register.test.tsx` | Form rendering (name/email/password inputs, submit button), client-side password length validation, API error display, navigation on successful registration | 5 |
| `src/pages/AuditPage.test.tsx` | Audit results rendering with mock data (summary strip, Robots & Sitemap, Meta Tags, Heading Structure, Image Alt Text sections), re-run audit button | 6 |

**Total: 16 frontend tests**

- All API calls are mocked via `vi.mock`
- Auth store and toast store are mocked to avoid Zustand dependency in tests
- `useNavigate` and `useParams` are mocked to control routing context

### CI (GitHub Actions)

`.github/workflows/test.yml` runs both backend and frontend tests on every push/PR to `main` or `master`.

### Intentionally Untested

| Area | Why |
|------|-----|
| Real GSC OAuth flow | Requires live Google credentials and browser redirect — tested manually |
| Cron jobs (watchdog, GSC daily sync) | Require running server + MongoDB + timers — tested manually via logs |
| Startup sweep | Requires server restart cycle — tested manually |
| Content SEO review, keyword research, competitor gap analysis | These are synchronous or async routes that depend on Groq API — the API mocking pattern is the same as the tested routes; adding more is diminishing returns |
| Frontend components (Shell, Sidebar, EmptyState, etc.) | Pure UI components with no logic — visual testing is more appropriate |
| Action plan generation | Complex multi-source gathering + Groq — tested manually; the async job pattern is already covered by the audit integration test |

---

## Deployment

### Docker (Hugging Face Spaces)

- **Dockerfile**: Multi-stage build, `node:20-bookworm-slim` base, builds frontend, copies backend + frontend/dist to production stage
- **.dockerignore**: Excludes `node_modules/`, `.env` files, and build artifacts from the Docker build context
- **Exposed port**: 7860 (HF Spaces convention)
- **Server binds**: `0.0.0.0` with `process.env.PORT`
- **CORS**: Explicit `FRONTEND_URL` env var (comma-separated, no wildcard `*`)
- **No Chromium/Puppeteer** anywhere in the image

### Frontend (Netlify / Vercel)

- **netlify.toml**: SPA fallback redirect rules included
- **VITE_API_URL**: Must be set in production to the full backend URL (e.g., `https://your-space.hf.space/api`)
- All API calls go through `api.ts` which uses `import.meta.env.VITE_API_URL || '/api'` as the base URL — no bare `/api/` hardcoded fetch calls

---

## Final Environment Variables

### Backend

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `GROQ_API_KEY` | ✅ | Groq API key for all AI calls |
| `SITE_ENCRYPTION_KEY` | ✅ | AES-256-CBC encryption key for GSC refresh tokens (32+ char random string) |
| `PORT` | Optional | Backend port (default 5001; matches local dev convention) |
| `GOOGLE_CLIENT_ID` | ✅* | Google OAuth2 client ID (required for rank tracking) |
| `GOOGLE_CLIENT_SECRET` | ✅* | Google OAuth2 client secret (required for rank tracking) |
| `GOOGLE_REDIRECT_URI` | ✅* | OAuth redirect URI (required for rank tracking) |
| `FRONTEND_URL` | ✅ | Comma-separated allowed CORS origins (no wildcard `*`) |
| `STRIPE_SECRET_KEY` | ✅* | Stripe test-mode secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | ✅* | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_PRO` | ✅* | Stripe Price ID for Pro plan (`price_...`) |

\* Required only if using Stripe billing.

\* Required only if using Google Search Console rank tracking.

### Frontend

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | Production only | Full backend URL with `/api` prefix. Leave empty for local dev (Vite proxy handles it). |

---

## Known Issues / Improvements with More Time

### Known Issues
1. **Access tokens are not revocable before expiry** — logout revokes the refresh token server-side and clears both cookies, but an already-issued access token stays cryptographically valid for up to 15 minutes. Standard stateless-JWT trade-off; a denylist would be needed to close it.
2. **Content review results are not persisted** — results are returned inline; user must re-run if they want them again. Could add a ContentReview model.
3. **Action plan quality depends on data availability** — if no audit/competitor/ranking data exists, the plan will be generic. The more data sources populated, the more specific the plan.
4. **GSC data is typically 2–3 days behind** — Google Search Console's API limitation, not ours.
5. **No pagination on notifications or lists** — all endpoints return the full set. For large datasets, add cursor-based pagination.
6. **No rate limiting on API routes** — should add express-rate-limit for production.
7. **No password reset flow** — users must contact an admin or re-register.

### Improvements with More Time
1. **Backlink Agent** — plug in a paid provider (Ahrefs, Moz) when budget allows.
2. **Multi-tab refresh races** — refresh tokens rotate on every use, so two tabs refreshing simultaneously can leave one holding a revoked token. The API wrapper dedupes concurrent refreshes within a single tab, but not across tabs. A `BroadcastChannel` lock or a short reuse-grace-window would close it.
3. **WebSocket / SSE** — replace polling with server-sent events for async job status updates.
4. **Role-based UI** — show/hide actions based on workspace role (currently all members can do everything).
5. **Audit scheduling** — allow users to schedule recurring audits (daily/weekly).
6. **Export to PDF/CSV** — export audit reports, action plans, and keyword data.
7. **Content review persistence** — add a ContentReview model to store results in MongoDB.
8. **Rate limiting** — add express-rate-limit to protect API routes.
9. **Password reset** — email-based password reset flow.
10. **E2E tests** — Playwright or Cypress tests for critical user flows.
11. **API pagination** — cursor-based pagination for lists (notifications, keywords, etc.).
12. **Mobile responsiveness** — the current mobile support is basic; could be improved with more attention to small screens.

---

## Phase History

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Project scaffolding + project_context.md | ✅ Complete |
| Phase 0.5 | Brand Logo (Dancing Script wordmark + favicons) | ✅ Complete |
| Phase 1 | Auth + Workspaces + Sites | ✅ Complete |
| Phase 2 | Technical SEO Audit Agent | ✅ Complete |
| Phase 3 | Keyword Research Agent | ✅ Complete |
| Phase 4 | Content SEO Agent | ✅ Complete |
| Phase 5 | Competitor Analysis Agent | ✅ Complete |
| Phase 6 | Google Search Console Integration | ✅ Complete |
| Phase 7 | Action Plan Agent | ✅ Complete |
| Phase 8 | Dashboard + Command Center | ✅ Complete |
| Phase 9 | Notifications + Polish | ✅ Complete |
| Phase 9.5 | Security Pages + Professional Footer | ✅ Complete |
| Phase 10 | Deployment Prep | ✅ Complete |
| Phase 11 | Testing | ✅ Complete |
| Phase 12 | Code Quality (ESLint + Prettier + JSDoc + cleanup) | ✅ Complete |
| Phase 13 | Recruiter Polish (README rewrite + LICENSE + portfolio-ready) | ✅ Complete |
| Phase 14 | Landing Page Background (Signal Network + floating icons + text chips) | ✅ Complete |
| Phase 15 | Welcome Tour + Mascot (first-visit overlay, 4-step stacked cards, TourMascot) | ✅ Complete |
| Phase 16 | Stripe Billing TEST MODE (Checkout, webhooks, plan lifecycle, free tier enforcement) | ✅ Complete |

---

## Handoff Notes

This file serves as a complete handoff document for anyone picking up the project cold. Key points:

- **Read the Architecture Decisions section first** — it explains the deliberate constraints (no Puppeteer, no Redis, single-process).
- **Read the Scope Decisions section in README.md** — it explains what's included and what's not, and why.
- **The async job pattern** is the core architectural pattern — understand it before adding new agents.
- **All AI calls go through Groq** with `response_format: { type: 'json_object' }`.
- **CORS is explicit** — no wildcard `*`. `FRONTEND_URL` must be set in production.
- **Server binds to 0.0.0.0** — required for containerized deployments.
- **Startup sweep + cron watchdog** guarantee no stuck jobs after container restarts.
- **GSC refresh tokens are encrypted at rest** — never stored plaintext in MongoDB.
- **Site model's `pre('save')` hook uses no `next()` callback** — Mongoose 9.x removed the `next` parameter from synchronous hooks. The hook just mutates `this.domain` directly.
- **Logo component** uses `@fontsource/dancing-script` (bundled, no external network request) — it's a pure React component, not an imported image. Use `<Logo variant="compact|full" theme="light|dark" />` anywhere.
- **Legal pages are public routes** — no auth required. They use `LegalLayout` for consistent styling. All legal text is genuinely accurate to the app — no fabricated compliance claims.
- **Footer appears only on landing, login, and register pages**. Authenticated pages use `Shell.tsx` and its top navbar; legal pages have their own layout with a "Back to app" link.
- **Code quality tooling** — ESLint + Prettier in both backend and frontend. Run `npm run lint` and `npm run format` from `backend/` or `frontend/`. Note: `@typescript-eslint` doesn't support TS 7.x yet, so frontend ESLint checks config files only; `tsc` handles type-checking.
- **API wrapper** moved from `src/lib/api.ts` to `src/api/api.ts` — the centralized fetch wrapper using `VITE_API_URL`.

### Landing Page — Premium Redesign

**Location:** `frontend/src/pages/LandingPage.tsx`

A premium, editorial-style landing page with full light/dark mode support. Designed to feel distinctive — not a generic SaaS template.

**No internal "Phase" labels anywhere in user-facing UI.** The feature cards previously carried "Phase 2"–"Phase 7" badges (internal build-phase numbering). These were replaced with real category words describing what each feature *does*: Technical, Keywords, Content, Competitors, Rankings, Strategy. The app Sidebar (`components/layout/Sidebar.tsx`) previously showed "Phase 1/2/5/6/7/8" badges per nav item; those were replaced with a meaningful availability status — `Live` (green/active) or `Soon` (dimmed) — and the "Coming in a future phase" tooltip is now "Coming soon". A repo-wide check confirms no "Phase N" string renders in any user-facing component (the only remaining `phase` identifier is `WelcomeTour`'s internal `'intro' | 'tour'` state variable, which is never displayed).

**Logo placement — exactly two locations:** (1) the sticky navbar, top-left, `<Logo variant="compact" />`; (2) the Footer, `<Logo variant="full" />`. The Footer logo previously had a `dark:block hidden` class that hid it entirely in light mode — that was removed so the footer is a genuine second logo location in both themes (the Logo component is token-driven and adapts automatically). No logos appear in the hero or any section body, preserving scarcity.

#### Landing Page Background — "SEO Signal" layered atmosphere

**Component:** `frontend/src/components/LandingBackground.tsx`

A **two-layer** background built to read as clearly intentional the moment the page loads (a deliberate, stronger revision of the earlier too-faint pass):

1. **Mesh-gradient glow (`.landing-mesh`)** — four radial-gradient stops blended from the brand palette (clay top-left, sage top-right, navy bottom-left, cream/clay bottom-right), driven by CSS tokens `--mesh-1..4`. It slowly breathes + drifts (`mesh-drift`, 30s, `translate + scale`, GPU-only). This layer gives the page depth and colour.
   - **Light mode:** a warm cream/clay field — a soft clay glow bleeds from the top-left behind the headline, a pale sage haze top-right, a cream warmth bottom-right, and a faint navy deepening bottom-left. Reads as a gently-lit warm paper atmosphere.
   - **Dark mode:** a deep navy field — a clay-light glow top-left, a stronger navy-light lift bottom-left, and a warm clay wash bottom-right, over the navy base. Reads as a dim control-room glow.
2. **Signal network SVG (`.signal-network`)** — 20 nodes + 28 edges (organic, non-grid) evoking crawled pages and links. Edges are static, `stroke=var(--net-edge)`, width 1.1 (legible, ~0.20 light / 0.28 dark). Nodes pulse (`node-pulse`, effective ~0.29–0.42 alpha via `--net-node` × element opacity 0.7↔1.0) — roughly 2× more present than the previous pass. The whole SVG drifts on a 45s cycle. This layer gives the background its distinct "data / SEO" identity.

Layered on top (supporting texture, not the main event): 8 floating SEO icons (search, trending-up, link, shield, code, bar-chart, check, globe) and 5 floating data chips ("Core Web Vitals", "+12 rankings", "Crawl complete", etc.), opacity bumped this pass so they integrate with the stronger field. A central safe-zone filter keeps floating elements out of the headline/CTA area.

**Behind every section (one continuous atmosphere):** the background is `position: fixed` at `z-0`; all page content sits at `z-[1]`. The hero is fully transparent (network + mesh at full strength). Every other section (Features, How It Works, Trust, Final CTA) uses a **semi-transparent** veil (`--color-bg-semi` / `--color-bg-alt-semi`, lowered from 0.88 → 0.80/0.82 this pass) so the mesh + network stay visible *through* the whole page — not a decorated hero over a flat body. Card surfaces remain fully opaque, so body text always sits on solid ground. The Footer is the one opaque grounding element at the very bottom.

**Adaptation / a11y / perf:** all colours are semantic tokens (`var(--mesh-*)`, `var(--net-*)`) with `.dark` overrides, so light/dark switch automatically. `prefers-reduced-motion: reduce` freezes the mesh drift, node pulse, network drift, and floating animations (everything stays visible, just static). Entirely CSS + inline SVG — no canvas/WebGL, no new dependencies. `pointer-events: none` throughout.

**Contrast (re-verified after the opacity increase):** headline `--color-text-primary` still sits at ≈12.5:1 (light: navy on cream) / ≈9.5:1 (dark: cream on navy) — the mesh glow is a low-alpha wash and the small pulsing nodes are peripheral texture, so foreground text readability is unaffected in both modes. The background is verified more visible/present than the previous pass (mesh gradient added as a whole new colour layer + node alpha ~doubled + veils lightened), not a repeat of the same subtle opacity.

#### Landing Page Entrance Animations (per-element motion signatures)

Scroll-triggered entrances via a one-shot `IntersectionObserver` (`useInView` hook) that adds an `anim-in` class; the actual motion is **keyframe-based** CSS (`enter-up` / `enter-left` / `enter-right`), transform + opacity only, ~0.45–0.5s `cubic-bezier(0.22,0.61,0.36,1)` ease-out. Keyframes (not transitions) are used deliberately so they never collide with the hover transitions on the same cards. Each element **type** has ONE consistent signature:

| Element type | Signature |
|---|---|
| Headlines / eyebrows / supporting text | **slide up** + fade (`enter-up`); within a block, staggered ~60ms apart |
| Hero dashboard mock | **slide in from the right** (`enter-right`) — mirrors the asymmetric hero layout |
| Feature cards | **alternate left / right** by index (even = from-left, odd = from-right), row-staggered by column (`(i % 3) * 80ms`) — a woven L/R cascade |
| Step cards (How It Works) | **cascade up**, staggered `i * 90ms` (steps appear in order) |
| Trust / credibility items | **cascade up**, staggered `i * 90ms` |

Motion is intentionally subtle and quick (short 22–28px travel, ~450ms). `prefers-reduced-motion: reduce` replaces every signature with an **opacity-only** fade (`enter-fade`) and forces `animation-delay: 0` (no slide, no stagger travel). On mobile the same signatures run; because they're transform/opacity keyframes with short duration and the observer fires as soon as an element enters view, content becomes readable immediately with no layout jank. Hover lift on all card types is a separate `.card-lift` class (box-shadow + border-color transition, never transform) so it can't fight the entrance keyframe.

**Consistent quality bar:** one type scale throughout; every card-like element shares `rounded-xl` + `shadow-card` + `p-5` + `.card-lift` hover; every button/link has a deliberate hover state; both themes are designed simultaneously (not dark-first patched to light).

#### Welcome Tour & Mascot

**Components:** `frontend/src/components/WelcomeTour.tsx` + `frontend/src/components/TourMascot.tsx`

A first-visit overlay with a friendly cartoon mascot that introduces the product through a playful opening line, followed by 4 tour steps presented as stacked cards.

**Trigger logic:**
- Shows automatically **only on a user's very first visit** — `LandingPage` initializes `tourOpen` by reading `localStorage.getItem('seo-os-tour-seen')`; if the flag is absent it auto-opens, if it's `'true'` it stays closed (wrapped in try/catch so private-mode / disabled storage falls back to showing it)
- On dismiss/completion, `WelcomeTour.handleClose` sets `seo-os-tour-seen` to `'true'` — so the tour never auto-shows again after the first time
- A persistent "Take the tour" button (magnifying-glass-plus icon) in the navbar allows manual replay at any time — this does NOT depend on the localStorage flag
- Appears as an overlay on top of the landing page (dimmed backdrop), not a separate route

**Mascot component (TourMascot.tsx):**
- A cheerful young boy character, flat-design illustration style, standing pose
- Big expressive eyes with eye-shine highlights, warm smile, rounded features
- Hair (navy), skin (cream-soft), shirt (accent/clay), pants (navy), shoes (clay)
- Uses ONLY existing theme color tokens — automatically adapts to light/dark mode
- 140px tall on desktop, 100px on mobile
- 3 idle animations (CSS keyframes, transform-only):
  - Gentle breathing/bob (`mascot-bob`, 3s cycle)
  - Occasional blink (eye shape swap every ~3.5s, 150ms duration) — handled via React state + setInterval
  - Wave on appear (`mascot-wave`, 1.2s one-shot) — right arm rotates with spring easing
- `prefers-reduced-motion: reduce` disables all mascot animations (static)

**Opening moment:**
- Mascot appears with a speech-bubble callout containing the opening line
- Typing-in effect (28ms per character) for personality
- Opening line: *"So you're the one with 47 SEO tabs open and a spreadsheet nobody reads? Let me fix that."*
- After typing completes, a "Show me around →" button fades in
- "Skip tour" link also visible during intro

**4-step stacked card tour:**

| Step | Title | Body |
|------|-------|------|
| 1 | One platform, zero duct tape | Audit, research, analyze, plan — all from a single dashboard. No more switching between five tools that don't talk to each other. |
| 2 | Technical audits in seconds | Crawl your site, find broken links, missing meta tags, and heading issues — no headless browser, no waiting. Results before your coffee cools. |
| 3 | AI agents that actually deliver | Keyword clustering, competitor gap analysis, content reviews — powered by Groq's 70B model with structured output. No hallucination in the pipeline. |
| 4 | Your action plan, prioritized | All data synthesized into one prioritized plan. 8–15 trackable items, ranked by impact. No more guessing what to do first. |

**Stacking interaction mechanic:**
- Card 1 slides in first (spring easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Pressing "Next" animates a new card sliding in from the right and stacking on top of the previous card, offset 10px down and 10px right — so the edge of the previous card peeks out from behind
- Previous cards are rendered as ghost outlines behind the active card (semi-transparent, at their stacked offset)
- Pressing "Back" reverses this exactly — the top card slides out and the previous card becomes fully visible
- Each card gets a subtle drop shadow that increases as more cards stack beneath it
- Progress indicator: 4 dots (active = wider, accent color; completed = smaller, accent/50; upcoming = border color) + "Step N of 4" text
- On the final card, "Next" becomes "Let's go →" which dismisses the tour

**Accessibility:**
- Keyboard: Escape closes, ArrowRight/Enter advances, ArrowLeft goes back
- Focus trap while overlay is open — Tab cycles within tour controls
- `role="dialog"`, `aria-modal="true"`, `aria-label="Welcome tour"`
- Body scroll locked while overlay is open
- `prefers-reduced-motion: reduce` — replaces slide animation with simple cross-fade, disables mascot bob/blink/wave

**Responsiveness:**
- Desktop: mascot on left, cards on right (side-by-side)
- Mobile: mascot above card (100px tall), single centered card (no stacking offset), speech bubble above card
- "Take the tour" button: icon-only on mobile, icon + text on desktop

**Theme adaptation:**
- All card surfaces use `var(--color-surface)` — white in light mode, navy-light in dark mode
- Text uses `var(--color-text-primary)` and `var(--color-text-secondary)` — adapts automatically
- Accent buttons use `var(--color-accent)` — clay in light, clay-light in dark
- Speech bubble uses `var(--color-surface)` with `var(--color-border)` — adapts to both themes
- Contrast verified: card text on card surface meets WCAG AA in both themes

- **Class-based dark mode** via `@custom-variant dark` in Tailwind v4's `index.css`
- **Semantic colour tokens** defined in `@theme` block — all components reference `var(--color-*)` tokens, never raw hex
- **Dark mode overrides** applied via `.dark` class selector on `<html>`, overriding all semantic tokens
- **Flash-of-wrong-theme prevention** — inline `<script>` in `index.html` reads localStorage + prefers-color-scheme and sets `dark` class BEFORE React hydrates
- **ThemeToggle component** (`frontend/src/components/ThemeToggle.tsx`) — sun/moon icon toggle, persists to localStorage key `seo-os-theme`, defaults to system preference on first visit

**Light mode palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#FDFBF6` (cream-soft) | Main background |
| `--color-bg-alt` | `#F3E4C9` (cream) | Alternating sections |
| `--color-surface` | `#FFFFFF` | Cards, elevated surfaces |
| `--color-text-primary` | `#0A2947` (navy) | Headlines, body text |
| `--color-text-secondary` | `rgba(10,41,71,0.7)` | Descriptions |
| `--color-accent` | `#8B5E3C` (clay) | CTAs, highlights |

**Dark mode palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0A2947` (navy) | Main background |
| `--color-bg-alt` | `#071D33` (navy-deep) | Alternating sections |
| `--color-surface` | `#123A5E` (navy-light) | Cards, elevated surfaces |
| `--color-text-primary` | `#F3E4C9` (cream) | Headlines, body text |
| `--color-text-secondary` | `rgba(243,228,201,0.7)` | Descriptions |
| `--color-accent` | `#A8794F` (clay-light) | CTAs, highlights (lightened for contrast on navy) |

#### Landing Page Sections

1. **Navbar** — sticky, backdrop-blur, Logo + ThemeToggle + Sign in + Get Started
2. **Hero** — bold headline ("Stop juggling. Start optimizing."), supporting description, dual CTAs, interactive dashboard mock (stats, issue bars, progress — built as real HTML/CSS, not an image)
3. **Problem/Agitation** — "SEO tools are fragmented." — frames the pain point before introducing the solution
4. **Feature Showcase** — 6 agents presented as alternating image-left/text-right sections, each with custom SVG icon, phase badge, and description. Not a generic icon grid.
5. **How It Works** — 4-step flow (01–04) with clear numbering
6. **Trust/Credibility** — honest technical facts (official GSC API, Groq AI, AES-256 encryption, container-safe architecture) — no fabricated testimonials or logos
7. **Final CTA** — full-width bg-alt section, one clear call to action
8. **Footer** — reuses existing Footer component, updated to use semantic theme tokens

#### Design Decisions

- **Editorial, not template** — bold oversized typography, asymmetric hero layout, generous whitespace, one dominant moment
- **Accent used sparingly** — only on CTAs, badges, and key highlights — restraint = design
- **Real product mock** — the dashboard mock in the hero shows actual audit data (stats, issue bars) — not a stock illustration
- **Scroll-triggered reveal** — sections fade/slide in via Intersection Observer (CSS `.reveal` + `.visible` classes)
- **No Framer Motion** — all animations are CSS-only, zero JS animation library overhead
- **Both themes designed simultaneously** — not dark-first with light patched on

### Phase 13 — Recruiter Polish

- **README.md** fully rewritten for recruiter/hiring-manager review: one-line pitch, shields.io badges, screenshots placeholder table, feature descriptions by agent, tech stack table, architecture decisions, live demo link, local setup instructions, testing section, known limitations, project structure diagram, MIT license link.
- **LICENSE** — MIT license file created at `/home/user/seo-operator/LICENSE`.
- **Secret scan** — no secrets, API keys, or `.env` files found anywhere in git. `.gitignore` properly excludes `.env` files. Only `backend/.env.example` is tracked (template with placeholder values).
- **Screenshots** — README has a placeholder table for dashboard, audit results, and action plan screenshots. The user should add actual screenshots manually.
- **End-to-end demo verification** — the user should manually verify the live demo at `https://seo-os.hf.space` to confirm all features work end-to-end.

---

## Pre-Deploy Verification — Full Pass (2026-07-31)

**Date:** 2026-07-31
**Scope:** End-to-end verification of the entire project before local testing and deployment.
**Result:** ✅ ALL CHECKS PASS (Docker: SKIPPED — not applicable in sandbox)

### Fixes Applied During This Verification

| # | What was broken | Why it would fail locally or during deployment | How it was fixed | Files modified | Affects |
|---|----------------|------------------------------------------------|-----------------|----------------|---------|
| 1 | Backend default PORT was 5000 | Vite dev server runs on port 5000 — backend would collide with it on startup if `.env` was missing `PORT` | Changed default from `5000` to `5001` in `server/index.js` | `backend/server/index.js` | Backend |
| 2 | MongoDB connection failure left server running partially | Server would accept requests but all DB operations would fail with cryptic errors. Production disconnects went unnoticed. | Changed `.catch()` to `process.exit(1)`. Added production disconnect handler that exits for orchestrator restart. | `backend/server/index.js` | Backend |
| 3 | Server started listening before MongoDB was connected | `app.listen()` was called synchronously while `mongoose.connect()` was still pending. Health check could report "connected" before the connection was actually established. | Moved `app.listen()` inside the `.then()` callback so the server only starts after MongoDB is connected. | `backend/server/index.js` | Backend |
| 4 | Env var validation happened after route/middleware setup | Validation was placed mid-file, after routes were mounted. If env vars were missing, the process would still set up middleware before exiting. | Moved env var validation to the very top of the file, immediately after `require('dotenv').config()`. | `backend/server/index.js` | Backend |
| 5 | `frontend/.env.production` had placeholder URL `https://your-space-name.hf.space/api` | Docker build would embed this URL into the built frontend. In Docker deployment, backend serves both API and frontend from the same origin, so the frontend should use relative `/api`. The placeholder URL would cause the Docker-deployed frontend to try to reach a non-existent external URL. | Changed `VITE_API_URL` to empty string with detailed comments explaining when to set it (Docker: leave empty; Netlify: set in UI). | `frontend/.env.production` | Frontend |
| 6 | `frontend/.env.example` had minimal documentation | Users wouldn't know the difference between Docker and Netlify deployment scenarios for `VITE_API_URL`. | Added comprehensive documentation explaining all three scenarios (local dev, Docker, Netlify). | `frontend/.env.example` | Frontend |
| 7 | `frontend/tailwind.config.js` was a leftover from Tailwind v3 | Tailwind v4 uses CSS-first `@theme` config in `index.css`. The file was dead code with a comment "kept for IDE tooling" but no tooling actually referenced it. | Deleted the file. | `frontend/tailwind.config.js` (deleted) | Frontend |
| 8 | Backend `package.json` lint script used deprecated `--ext .js` flag | ESLint 10 deprecated the `--ext` flag. The flat config in `eslint.config.cjs` already specifies which files to lint. | Removed `--ext .js` from both `lint` and `lint:fix` scripts. | `backend/package.json` | Backend |
| 9 | `project_context.md` said "Root-level scripts — removed" | Root `package.json` with `concurrently` exists and works. The documentation was stale. | Updated to accurately describe the root `package.json` and its scripts. | `project_context.md` | Docs |
| 10 | `project_context.md` said PORT default was 5000 | After fix #1, the default is now 5001. | Updated all references to PORT default in project_context.md. | `project_context.md` | Docs |

### Verification Table

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | **Project Structure** | ✅ PASS | `/frontend` and `/backend` are completely independent. No cross-dependencies. No unused files. No duplicate code. No orphan files. No circular imports. Naming conventions consistent. Folder structure clean and documented. |
| 2 | **Dependency Installation** | ✅ PASS | `cd backend && npm install` completes with zero errors. `cd frontend && npm install --legacy-peer-deps` completes with zero errors. Neither project requires the root `package.json` or the other's `node_modules`. |
| 3 | **Environment Variables** | ✅ PASS | All 10 backend env vars (`MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `SITE_ENCRYPTION_KEY`, `PORT`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `NODE_ENV`) documented in `backend/.env.example`. The 1 frontend env var (`VITE_API_URL`) documented in `frontend/.env.example`. Missing required vars → clear error + `process.exit(1)`. No hardcoded secrets. No fallback secrets. |
| 4 | **Frontend ↔ Backend Communication** | ✅ PASS | All API calls go through `frontend/src/api/api.ts` using `VITE_API_URL || '/api'`. No hardcoded localhost URLs. No direct fetch/axios calls outside the API layer. Vite proxy forwards `/api` to `localhost:5001` in dev. |
| 5 | **CORS** | ✅ PASS | Backend uses `FRONTEND_URL` env var (defaults to `http://localhost:5000` in dev). Supports comma-separated list. No wildcard `*`. Production requires `FRONTEND_URL` to be set. |
| 6 | **Ports** | ✅ PASS | Backend defaults to port 5001 (no collision with Vite on 5000). Both ports configurable via env vars. Vite proxy configured to forward to 5001. |
| 7 | **Database** | ✅ PASS | Server exits with clear error if `MONGO_URI` is missing. Server exits with clear error if MongoDB connection fails. Production disconnect triggers `process.exit(1)` for orchestrator restart. Server only starts listening AFTER successful DB connection. |
| 8 | **Routes & Module Wiring** | ✅ PASS | All 7 route files mounted: auth, workspaces, sites, competitors, gsc, actionPlans, notifications. All 10 models registered. All 5 agents reachable. All 3 jobs wired. All 2 lib modules functional. No orphan files. No circular imports. |
| 9 | **Scheduled Jobs** | ✅ PASS | All 3 cron jobs (auditTimeout, gscDailySync, startupSweep) initialize safely. They only run after MongoDB connects successfully. Startup sweep handles empty collections gracefully. |
| 10 | **Production Build** | ✅ PASS | `cd frontend && npm run build` completes with zero errors. `tsc` passes. Only warning: chunk size > 500KB (informational). Backend runs with `NODE_ENV=production` — static file serving and SPA fallback work correctly. |
| 11 | **Tests** | ✅ PASS | Backend: 35 tests passing (0 failures). Frontend: 16 tests passing (0 failures). Total: 51 tests. No skipped tests. |
| 12 | **Lint** | ✅ PASS | Backend: ESLint 0 errors, 0 warnings. Frontend: ESLint 0 errors, 0 warnings. |
| 13 | **Docker** | ⚠️ SKIPPED | Docker not available in sandbox. Dockerfile reviewed — all source directories covered, no missing COPY directives. `.dockerignore` properly excludes `.env` files and `node_modules`. User must test locally with `docker build -t seo-os .` |

### Summary

The project is ready for local testing and deployment. The 10 fixes applied during this verification address:

1. **Startup reliability** — env var validation moved to the top, MongoDB connection failure exits cleanly, server only listens after DB connection.
2. **Port consistency** — default backend port matches the local dev convention (5001).
3. **Deployment correctness** — Docker deployment uses relative `/api` (not an external placeholder URL).
4. **Code hygiene** — removed dead `tailwind.config.js`, removed deprecated ESLint `--ext` flag.
5. **Documentation accuracy** — `project_context.md` reflects the current state of the project.
