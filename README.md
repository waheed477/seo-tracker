# SEO Operating System

**AI-powered multi-agent SEO platform — audit, analyze, and act, all in one place.**

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq](https://img.shields.io/badge/AI-Groq-f55036?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6Ii8+PC9zdmc+&logoColor=white)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## Screenshots

> **Placeholder** — add your own screenshots or GIF here. Recommended captures:
>
> | Dashboard | Audit Results | Action Plan |
> |-----------|--------------|-------------|
> | ![Dashboard](docs/screenshots/dashboard.png) | ![Audit](docs/screenshots/audit.png) | ![Action Plan](docs/screenshots/action-plan.png) |

---

## Features

### 🔧 Technical SEO Audit
Crawl your site with axios + cheerio (no headless browser) and get a detailed report: missing meta descriptions, missing title tags, duplicate titles, heading issues, missing alt text, robots.txt analysis, sitemap validation, and broken internal links. Runs asynchronously — results appear in seconds to minutes.

### 🔍 Keyword Research
Enter seed keywords and the AI expands them into topic clusters with intent classification (informational, transactional, navigational, commercial) and AI-estimated difficulty scores. Results are saved and grouped by cluster.

### ✍️ Content SEO Review
Submit a page URL or paste content and the AI evaluates keyword usage, structure, and readability. Get specific improvement suggestions with an estimated readability score.

### 🏆 Competitor Gap Analysis
Add competitor domains and the AI crawls their public pages to identify content topics they cover that you don't. Each gap is quantified with an opportunity score.

### 📈 Rank Tracking (Google Search Console)
Connect your site's Google Search Console property via OAuth. The platform pulls real position, click, and impression data from the official API — no SERP scraping. A daily cron syncs data automatically. View position trends and top queries over time.

### 📋 Action Plan
The synthesis layer. Gathers data from audits, keyword research, competitor analysis, and rank tracking, then generates a prioritized action plan with 8–15 specific items. Track each item from "to-do" → "in progress" → "done."

### 🔔 Notifications
Get notified when async jobs complete (audit done, action plan ready, competitor analysis finished, GSC sync error). The notification bell in the header shows unread count and a dropdown panel.

### 🏢 Multi-Workspace
Organize sites into workspaces. Invite team members with owner, admin, or member roles. All data is scoped to the workspace.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Node.js 20 | LTS, native `--watch` flag for dev |
| **Backend** | Express 4, Mongoose, CommonJS | Minimal, well-understood, single-process |
| **Auth** | JWT (jsonwebtoken + bcrypt, 12 rounds) | Stateless auth with hashed passwords |
| **Crawler** | axios + cheerio | Fast server-side parsing — no headless browser needed |
| **Scheduler** | node-cron | In-process cron — no Redis/BullMQ dependency |
| **AI** | Groq API (llama-3.3-70b-versatile) | Ultra-fast LLM inference; all AI calls return structured JSON |
| **Encryption** | Node.js crypto (AES-256-CBC) | GSC refresh tokens encrypted at rest |
| **OAuth** | Google Search Console API | Official API — the only rank-tracking mechanism |
| **Frontend** | React 19, Vite 8, TypeScript 7 | Fast DX, tree-shakeable bundles |
| **Styling** | Tailwind CSS v4 | Utility-first; design tokens in CSS `@theme` block |
| **State** | Zustand 5 | Auth store + workspace store + toast store |
| **Charts** | Recharts | Composable chart primitives for position/clicks trends |

---

## Architecture

This project is deliberately designed for **constrained hosting environments** — Hugging Face Spaces, free-tier cloud instances, or any single-container deployment.

### Single-Process, No-Redis, No-Puppeteer

| Decision | Why it's deliberate |
|----------|-------------------|
| **No Puppeteer / headless browser** | Chromium adds ~400 MB to the Docker image and is unreliable in memory-constrained containers. axios + cheerio handles all HTTP crawling. |
| **No Redis / BullMQ** | A job queue requires a separate process. Instead, all async work runs in-process with a fire-and-forget pattern. A node-cron watchdog marks stuck jobs as failed after 5 minutes. |
| **Single exposed port** | The backend serves the API on one port. In production, it also serves the Vite-built frontend as static files with SPA fallback. One container, one process. |
| **No external queue** | The async job pattern (create doc → fire-and-forget → update status → watchdog timeout) replaces the need for BullMQ. Jobs are tracked in MongoDB. |

### Async Job Pattern

All long-running tasks (audits, competitor analysis, action plans) follow the same fire-and-forget pattern:

```
1. Route handler creates a Mongoose doc with status: 'queued'
2. Handler responds immediately with 202 + { jobId }
3. Handler calls runXxxAsync(docId) WITHOUT await — fire and forget
4. runXxxAsync() updates doc to 'running', runs the agent, then sets 'done' or 'failed'
5. Frontend polls GET /latest every 3 seconds until status is 'done' or 'failed'
6. Cron watchdog (every 1 min) marks stuck 'running' jobs > 5 min as 'failed'
7. Startup sweep (on boot) marks any jobs stuck from a container crash as 'failed'
```

### Container Restart Safety

- **Startup sweep** — On every boot, all jobs in `running` status are immediately marked `failed`. On boot we know with certainty the previous process is gone.
- **Cron watchdog** — Every minute, marks any `running` job older than 5 minutes as `failed`.
- Together, these guarantee no job is ever permanently stuck after a container restart.

### Crawl Constraints

- Max 20 pages per audit crawl
- 400 ms polite delay between every HTTP request
- 10 s page-fetch timeout, 5 s HEAD timeout
- Max 5 competitor gap analyses per site per 24 hours
- Transparent User-Agent: `SEO-OS-Audit/1.0 (Technical SEO auditing tool)`
- robots.txt respected — always

---

## Live Demo

**🚀 [Try the live demo](https://seo-os.hf.space)** — deployed on Hugging Face Spaces.

Full end-to-end flow: register → create workspace → add site → run audit → generate action plan.

---

## Local Setup

### Prerequisites

- **Node.js 20+**
- **MongoDB** (Atlas or local)
- **Groq API key** — [get one free at groq.com](https://console.groq.com/)
- **Google Cloud project** (optional — for Search Console rank tracking)

### 1. Clone and Install

```bash
git clone https://github.com/waheed477/SEO-operator-system.git
cd SEO-operator-system

# Install backend dependencies
cd backend && npm install --legacy-peer-deps --no-fund --no-audit && cd ..

# Install frontend dependencies
cd frontend && npm install --legacy-peer-deps --no-fund --no-audit && cd ..
```

### 2. Configure Environment

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```bash
cp backend/.env.example backend/.env
```

Required variables:

| Variable | What to set |
|----------|------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | A long random string |
| `GROQ_API_KEY` | Your Groq API key |
| `SITE_ENCRYPTION_KEY` | A 32+ character random string |

For Google Search Console rank tracking (optional), also set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

### 3. Run

```bash
# Terminal 1 — Backend (port 5001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5000)
cd frontend && npm run dev
```

- **Backend:** `http://localhost:5001`
- **Frontend:** `http://localhost:5000` (Vite dev server with proxy to backend)

### 4. Production Build

```bash
cd frontend && npm run build
NODE_ENV=production PORT=5000 node backend/server/index.js
```

Or use the included Dockerfile:

```bash
docker build -t seo-os .
docker run -p 7860:7860 \
  -e MONGO_URI=mongodb+srv://... \
  -e JWT_SECRET=... \
  -e GROQ_API_KEY=... \
  -e SITE_ENCRYPTION_KEY=... \
  -e FRONTEND_URL=https://your-space.hf.space \
  seo-os
```

---

## Testing

### Run All Tests

```bash
cd backend && npm test
cd frontend && npm test
```

### Backend (44 tests)

```bash
cd backend && npm test
```

| Suite | Type | What's covered |
|-------|------|---------------|
| `tests/unit/authMiddleware.test.js` | Unit | JWT auth middleware: valid token, missing token, expired token, wrong secret, malformed token |
| `tests/unit/validation.test.js` | Unit | Input validation on auth, workspace, and site routes |
| `tests/integration/auth.test.js` | Integration | Register (success, duplicate, normalisation), login (success, wrong password, case-insensitive) |
| `tests/integration/sites.test.js` | Integration | Create site, domain normalisation, duplicate rejection, audit latest |
| `tests/integration/billing.test.js` | Integration | Free tier limit enforcement (1 site max, 2nd returns 403), webhook event handling (checkout, subscription updated/deleted, invoice failed) |

- All external calls mocked (Groq, PageSpeed, GSC) — zero real network requests
- Uses `mongodb-memory-server` for isolated in-memory MongoDB
- `technicalSeoAgent.run()` is mocked so audits complete instantly

### Frontend (16 tests)

```bash
cd frontend && npm test
```

| Suite | What's covered |
|-------|---------------|
| `Login.test.tsx` | Form rendering, error display on failed login, navigation on success |
| `Register.test.tsx` | Form rendering, client-side password validation, API error display |
| `AuditPage.test.tsx` | Audit results rendering with mock data, summary strip, all issue sections |

- All API calls mocked via `vi.mock`
- Auth store and toast store are mocked to isolate component logic

### CI

`.github/workflows/test.yml` runs both backend and frontend tests on every push/PR to `main`.

---

## Known Limitations

1. **JWT is in-memory only** — users must re-login on page refresh. This is a deliberate trade-off for simplicity. Upgrade path: httpOnly cookies with refresh tokens.
2. **Content review results are not persisted** — results are returned inline; user must re-run if they want them again.
3. **Action plan quality depends on data availability** — if no audit/competitor/ranking data exists, the plan will be generic. The more data sources populated, the more specific the plan.
4. **GSC data is typically 2–3 days behind** — Google Search Console's API limitation, not ours.
5. **No pagination on lists** — all endpoints return the full set. For large datasets, add cursor-based pagination.
6. **No rate limiting on API routes** — should add `express-rate-limit` for production.
7. **No password reset flow** — users must contact an admin or re-register.
8. **Keyword difficulty is AI-estimated** — not real SERP data. The UI labels this honestly.
9. **Backlink Agent is not included** — no free reliable data source exists. The architecture supports plugging one in.
10. **Payments are integrated via Stripe in TEST MODE** — this demonstrates a complete subscription billing flow (Checkout, webhooks, plan lifecycle) without processing real payments, since this is a portfolio project.

---

## Project Structure

```
seo-operator/
├── backend/                          # Express + Mongoose API server
│   ├── server/
│   │   └── index.js                  # App entry: Express, CORS, routes, static serving
│   ├── routes/
│   │   ├── auth.js                   # Register, login
│   │   ├── workspaces.js             # Workspace CRUD + members
│   │   ├── sites.js                  # Site CRUD + audit trigger
│   │   ├── competitors.js            # Competitor CRUD + gap analysis
│   │   ├── gsc.js                    # Google Search Console OAuth + rankings
│   │   ├── actionPlans.js            # Action plan generation + item tracking
│   │   ├── notifications.js          # Workspace notifications
│   │   └── webhooks.js               # Stripe webhook handler (raw body)
│   ├── models/
│   │   ├── User.js                   # email, passwordHash, name
│   │   ├── Workspace.js              # name, ownerId, members[], plan, planStatus, stripeCustomer
│   │   ├── Site.js                   # domain, gscConnected, encrypted refresh token
│   │   ├── Audit.js                  # status, results{technical}
│   │   ├── Keyword.js                # keyword, cluster, intent, difficulty
│   │   ├── Competitor.js             # domain, lastCrawledAt
│   │   ├── ContentGapReport.js       # status, gaps[]
│   │   ├── RankSnapshot.js           # queryText, avgPosition, clicks, impressions
│   │   ├── ActionPlan.js             # status, items[], summary
│   │   └── Notification.js           # type, message, read, relatedSiteId
│   ├── services/
│   │   ├── agents/
│   │   │   ├── technicalSeoAgent.js  # Crawl + audit (axios + cheerio)
│   │   │   ├── keywordResearchAgent.js  # AI keyword expansion + clustering
│   │   │   ├── contentSeoAgent.js    # AI content review + readability
│   │   │   ├── competitorAgent.js    # Crawl competitor + AI gap analysis
│   │   │   └── actionPlanAgent.js    # Synthesize all data into plan
│   │   ├── gscService.js             # Google OAuth2 + Search Analytics API
│   │   └── stripeService.js          # Stripe Checkout + Portal session creation
│   ├── jobs/
│   │   ├── auditTimeout.js           # Cron watchdog (1 min)
│   │   ├── gscDailySync.js           # Daily GSC data sync (6 AM UTC)
│   │   └── startupSweep.js           # Mark stuck jobs as failed on boot
│   ├── middleware/
│   │   └── auth.js                   # JWT auth middleware
│   ├── lib/
│   │   ├── encryption.js             # AES-256-CBC encrypt/decrypt
│   │   └── notify.js                 # Create workspace notification
│   └── tests/
│       ├── unit/                     # authMiddleware, validation
│       └── integration/              # auth, sites (with mongodb-memory-server)
│
├── frontend/                         # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/
│   │   │   └── api.ts                # Centralized fetch wrapper (VITE_API_URL)
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx       # Public marketing/landing page
│   │   │   ├── Login.tsx             # Login form
│   │   │   ├── Register.tsx          # Registration form
│   │   │   ├── Workspaces.tsx        # Workspace list + create
│   │   │   ├── Sites.tsx             # Site list + add
│   │   │   ├── AuditPage.tsx         # Audit results + re-run
│   │   │   ├── KeywordPage.tsx       # Keyword research + clusters
│   │   │   ├── ContentReviewPage.tsx # Content SEO review
│   │   │   ├── CompetitorPage.tsx    # Competitor gap analysis
│   │   │   ├── RankingsPage.tsx      # GSC rank tracking + charts
│   │   │   ├── ActionPlanPage.tsx    # Action plan items + status tracking
│   │   │   ├── BillingPage.tsx       # Billing & Plans (upgrade/manage billing)
│   │   │   ├── Dashboard.tsx         # Command center
│   │   │   ├── PrivacyPolicy.tsx     # Legal pages
│   │   │   ├── TermsOfService.tsx
│   │   │   ├── SecurityPage.tsx
│   │   │   ├── CookiePolicy.tsx
│   │   │   └── ContactPage.tsx
│   │   ├── components/
│   │   │   ├── auth/                 # ProtectedRoute
│   │   │   ├── layout/              # Shell (sidebar + header), Sidebar
│   │   │   ├── ui/                  # Button, Input, EmptyState, LoadingSkeleton,
│   │   │   │                         # ErrorBoundary, Toast, NotificationBell
│   │   │   ├── Logo.tsx             # Dancing Script wordmark
│   │   │   ├── UpgradeModal.tsx     # Free tier limit upgrade modal
│   │   │   ├── Footer.tsx           # 4-column professional footer
│   │   │   └── LegalLayout.tsx      # Shared wrapper for legal pages
│   │   ├── store/
│   │   │   ├── authStore.ts         # JWT + user (in-memory Zustand)
│   │   │   ├── workspaceStore.ts    # Current workspace ID
│   │   │   └── toastStore.ts        # Toast notifications
│   │   ├── App.tsx                  # Routes (landing + /app/* protected)
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Tailwind v4 theme tokens
│   ├── public/                       # favicon.svg, favicon-16x16.png, favicon-32x32.png
│   └── vite.config.ts               # Vite + proxy /api → localhost:5001
│
├── Dockerfile                        # Multi-stage build for HF Spaces
├── .dockerignore
├── netlify.toml                      # SPA fallback + security headers
├── .editorconfig                     # Consistent indentation
├── .github/workflows/test.yml        # CI: backend + frontend tests
├── LICENSE                           # MIT
└── README.md
```

---

## License

[MIT](./LICENSE) — use this project however you'd like.
