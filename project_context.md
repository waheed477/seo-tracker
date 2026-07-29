# Project Context — SEO Operating System

## Current Status
**Portfolio-ready.** All 13 phases complete. README rewritten for recruiter/hiring-manager review, MIT LICENSE added, code quality tooling in place, 51 tests passing. Live demo at [https://seo-os.hf.space](https://seo-os.hf.space), repo at [https://github.com/waheed000/seo-operator](https://github.com/waheed000/seo-operator).

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
- **Single exposed port** — backend defaults to `PORT || 5000`. In local dev set `PORT=5001` in `backend/.env`; in production one process serves Vite build as static files from Express
- **Stateless JWT** — in-memory Zustand store; user re-logs in on page refresh. Upgrade path: httpOnly cookies
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

### OAuth Flow (Google Search Console)

```
1. Frontend: user clicks "Connect Search Console"
2. Browser redirects to GET /api/sites/:id/gsc/connect?token=JWT
   → Server validates JWT, builds Google OAuth consent URL, redirects browser
3. User consents in Google's UI
4. Google redirects to GET /api/sites/:id/gsc/callback?code=xxx
   → Server exchanges code for access_token + refresh_token
   → encrypt(refresh_token) with AES-256-CBC + SITE_ENCRYPTION_KEY
   → Store encrypted refresh token + gscConnected=true + gscSiteUrl in Site doc
   → Redirect browser back to frontend /sites/:id/rankings?gsc=connected
5. For all future GSC API calls: decrypt(refresh_token) → refresh access_token → call GSC API
```

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
| GET | `/api/sites/:id/gsc/callback` | — (Google redirect) | OAuth callback, exchange code, store encrypted refresh token |
| GET | `/api/sites/:id/rankings?days=30` | ✅ + member | Aggregated GSC ranking data |
| POST | `/api/sites/:id/gsc/sync` | ✅ + member | Manually trigger GSC data sync |
| POST | `/api/sites/:id/action-plan` | ✅ + member | Generate action plan (async, returns 202 + planId) |
| GET | `/api/sites/:id/action-plan/latest` | ✅ + member | Latest action plan for polling |
| PATCH | `/api/sites/:id/action-plan/items/:itemId` | ✅ + member | Update action item status |
| GET | `/api/notifications?workspaceId=` | ✅ + member | List workspace notifications |
| PATCH | `/api/notifications/:id/read` | ✅ + member | Mark notification as read |
| PATCH | `/api/notifications/read-all` | ✅ + member | Mark all workspace notifications as read |

All routes return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

---

## Frontend Components (Reusable)

| Component | Purpose |
|-----------|---------|
| `Logo` | Brand logo with two variants (full/compact) and light/dark theme — uses Dancing Script signature wordmark |
| `Footer` | Professional 4-column footer with brand, product links, company links, and legal links — appears on all pages |
| `LegalLayout` | Shared wrapper for static legal/trust pages — navy background, logo, back navigation, consistent typography |
| `EmptyState` | Reusable empty state with icon, title, description, and optional CTA button |
| `LoadingSkeleton` | Reusable shimmer skeleton rows (configurable count and height) |
| `ErrorBoundary` | React error boundary wrapping the main content area |
| `ToastContainer` | Toast notification system (success/error/info) — auto-dismisses after 4 seconds |
| `NotificationBell` | Bell icon in header showing unread count badge, dropdown panel with notification list |

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
| All authenticated pages (Shell) | ✅ | `<Footer />` inside Shell's right column, below `<main>` |
| Legal pages (Privacy, Terms, Security, Cookie, Contact) | ❌ | Legal pages have their own `LegalLayout` with a "Back to app" link instead |

---

## Code Quality

### Linting & Formatting

| Layer | Tool | Config | Scripts |
|-------|------|--------|---------|
| Backend | ESLint 10 + Prettier | `backend/eslint.config.cjs`, `backend/.prettierrc` | `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check` |
| Frontend | ESLint 10 + Prettier | `frontend/eslint.config.cjs`, `frontend/.prettierrc` | `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check` |
| Root | `.editorconfig` | Consistent indentation across editors | `npm run lint`, `npm run format`, `npm test` (runs both) |

**Backend ESLint rules:** `prefer-const`, `no-var`, `eqeqeq`, `curly`, `no-debugger`, `no-empty` (no empty catch), `no-cond-assign`, `no-template-curly-in-string`, `no-async-promise-executor`, `no-useless-return`, `no-unused-vars` (warn, underscore-prefixed ignored).

**Frontend ESLint note:** `@typescript-eslint` doesn't support TypeScript 7.x yet (as of July 2025). ESLint checks config files only; TypeScript's own compiler (`tsc`) handles type-checking for `.ts`/`.tsx` files. Prettier handles formatting. When TS 7 support arrives, the TypeScript-specific rules can be re-enabled.

**Prettier config (both):** Semi, single quotes, trailing commas, 120 char print width, 2-space indent, LF line endings. Frontend also uses `prettier-plugin-tailwindcss` for class sorting.

**Root-level scripts** (`package.json`):

| Script | What it does |
|--------|-------------|
| `npm run install:all` | Installs root + backend + frontend dependencies |
| `npm run dev` | Runs both dev servers concurrently (backend + frontend) |
| `npm run lint` | Runs ESLint on both backend and frontend |
| `npm run format` | Runs Prettier on both backend and frontend |
| `npm test` | Runs both backend and frontend test suites |

### Code Cleanup Performed

- **No leftover console.log statements** — all `console.log/error/warn` in the backend are intentional server-side logging (startup, cron, audit completion, error handling). No debug leftovers.
- **No env var exposure in error responses** — error responses never include `process.env` values, secrets, or API keys.
- **Consistent error handling** — all route handlers use try/catch with `res.status(500).json({ success: false, error: '...' })`. No unhandled promise rejections.
- **Unused imports removed** — `technicalSeoAgent` (unused in competitors route), `encrypt` (unused in gscService), `validStatuses` (unused in actionPlanAgent), `mongoose` (unused in auth integration test), and test file unused model imports were all cleaned up.
- **JSDoc enhanced** on all 5 agent files — each now has a clear `@module` tag, description of what it does, inputs/outputs, and `@param`/`@returns` on the main `run()` function.

### Folder Structure

```
/backend
  /models        — Mongoose schemas (User, Workspace, Site, Audit, Keyword, Competitor, ContentGapReport, RankSnapshot, ActionPlan, Notification)
  /routes         — Express route handlers (auth, workspaces, sites, competitors, gsc, actionPlans, notifications)
  /middleware     — Auth middleware (requireAuth)
  /services
    /agents       — AI agents (technicalSeoAgent, keywordResearchAgent, contentSeoAgent, competitorAgent, actionPlanAgent)
    gscService.js — Google Search Console OAuth + Search Analytics
  /lib            — Shared utilities (encryption.js, notify.js)
  /jobs           — Cron jobs (auditTimeout, gscDailySync, startupSweep)
  /server         — Server entry point (index.js)
  /tests          — Jest tests (unit/ + integration/)

/frontend
  /src
    /api          — Centralized fetch wrapper (api.ts) using VITE_API_URL
    /pages        — Route page components (+ .test.tsx files)
    /components   — Reusable UI components (auth/, layout/, ui/) + Logo, Footer, LegalLayout
    /store        — Zustand stores (authStore, workspaceStore, toastStore)
    /test         — Test setup (setup.ts)
    App.tsx       — Root router
    main.tsx      — Entry point
    index.css     — Tailwind CSS v4 theme tokens
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
| `PORT` | Optional | Backend port (default 5000; use 5001 locally) |
| `GOOGLE_CLIENT_ID` | ✅* | Google OAuth2 client ID (required for rank tracking) |
| `GOOGLE_CLIENT_SECRET` | ✅* | Google OAuth2 client secret (required for rank tracking) |
| `GOOGLE_REDIRECT_URI` | ✅* | OAuth redirect URI (required for rank tracking) |
| `FRONTEND_URL` | ✅ | Comma-separated allowed CORS origins (no wildcard `*`) |

\* Required only if using Google Search Console rank tracking.

### Frontend

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | Production only | Full backend URL with `/api` prefix. Leave empty for local dev (Vite proxy handles it). |

---

## Known Issues / Improvements with More Time

### Known Issues
1. **JWT is in-memory only** — users must re-login on page refresh. This is a deliberate trade-off for simplicity. Upgrade path: httpOnly cookies with refresh tokens.
2. **Content review results are not persisted** — results are returned inline; user must re-run if they want them again. Could add a ContentReview model.
3. **Action plan quality depends on data availability** — if no audit/competitor/ranking data exists, the plan will be generic. The more data sources populated, the more specific the plan.
4. **GSC data is typically 2–3 days behind** — Google Search Console's API limitation, not ours.
5. **No pagination on notifications or lists** — all endpoints return the full set. For large datasets, add cursor-based pagination.
6. **No rate limiting on API routes** — should add express-rate-limit for production.
7. **No password reset flow** — users must contact an admin or re-register.

### Improvements with More Time
1. **Backlink Agent** — plug in a paid provider (Ahrefs, Moz) when budget allows.
2. **httpOnly cookies** — replace in-memory JWT with secure httpOnly cookies + refresh token rotation.
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
- **Footer appears on all pages** — Login, Register, and authenticated pages via Shell. Legal pages use their own layout with a "Back to app" link instead.
- **Code quality tooling** — ESLint + Prettier in both backend and frontend. Run `npm run lint` and `npm run format` from root. Note: `@typescript-eslint` doesn't support TS 7.x yet, so frontend ESLint checks config files only; `tsc` handles type-checking.
- **API wrapper** moved from `src/lib/api.ts` to `src/api/api.ts` — the centralized fetch wrapper using `VITE_API_URL`.

### Phase 13 — Recruiter Polish

- **README.md** fully rewritten for recruiter/hiring-manager review: one-line pitch, shields.io badges, screenshots placeholder table, feature descriptions by agent, tech stack table, architecture decisions, live demo link, local setup instructions, testing section, known limitations, project structure diagram, MIT license link.
- **LICENSE** — MIT license file created at `/home/user/seo-operator/LICENSE`.
- **Secret scan** — no secrets, API keys, or `.env` files found anywhere in git. `.gitignore` properly excludes `.env` files. Only `backend/.env.example` is tracked (template with placeholder values).
- **Screenshots** — README has a placeholder table for dashboard, audit results, and action plan screenshots. The user should add actual screenshots manually.
- **End-to-end demo verification** — the user should manually verify the live demo at `https://seo-os.hf.space` to confirm all features work end-to-end.
