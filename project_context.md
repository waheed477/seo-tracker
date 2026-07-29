# Project Context — SEO Operating System

## Current Status
Phase 2 complete: Technical SEO Audit Agent, Audit model, async fire-and-forget crawl jobs,
cron-based timeout watchdog, and a full audit results dashboard on the frontend.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20 | LTS, native `--watch` flag for dev |
| Backend framework | Express 4 | Minimal, well-understood, single-process |
| ODM | Mongoose | Schema + validation on top of MongoDB |
| Auth | jsonwebtoken + bcrypt | Stateless JWT auth, bcrypt (12 rounds) |
| HTTP client | axios | Page fetching + HEAD link checks in the audit agent |
| HTML parsing | cheerio | Fast server-side jQuery-like parsing — no headless browser |
| Scheduler | node-cron | In-process cron for audit timeout watchdog — no Redis/BullMQ |
| Config | dotenv | 12-factor env var loading |
| CORS | cors | Cross-origin policy for frontend ↔ backend |
| AI | Groq API (via axios) | Ultra-fast LLM inference; all AI calls go through Groq |
| Frontend | React 18 + Vite + TypeScript | Fast DX, tree-shakeable bundles |
| Routing | React Router v6 | Client-side routing with protected route guard |
| Styling | Tailwind CSS v4 | Utility-first; design tokens in CSS `@theme` block |
| State | Zustand | Auth store (in-memory JWT) |
| Charts | Recharts | Composable chart primitives (used from Phase 3+) |
| Fonts | Space Grotesk (headings) + Inter (body) | Confident/technical SaaS feel |

## Architecture Decisions
- **No Puppeteer** — crawling uses axios + cheerio only (HF Spaces Docker compatibility)
- **No Redis / BullMQ** — all async work runs in-process; node-cron for scheduling
- **Single exposed port** — backend defaults to `PORT || 5000`. In local dev set `PORT=5001` in `backend/.env`; in production one process serves Vite build as static files from Express
- **Stateless JWT** — in-memory Zustand store; user re-logs in on page refresh. Upgrade path: httpOnly cookies
- **Backlink Agent omitted** — no free reliable data source; architecture allows plugging in a paid provider
- **Keyword difficulty is AI-estimated** — must be labeled honestly in UI
- **Rank tracking via Google Search Console API** — never scrape Google SERPs

### Async Job Pattern (fire-and-forget — reuse for all future agents)
Used for any long-running background task (audit crawl, keyword analysis, rank fetch):

```
1. Route handler creates a Mongoose doc with status: 'queued'
2. Handler responds immediately with 202 + { auditId }
3. Handler calls runXxxAsync(docId, ...args) WITHOUT await — fire and forget
4. runXxxAsync():
     a. Updates doc to status: 'running', startedAt: now
     b. Runs the agent
     c. On success → status: 'done', completedAt, results
     d. On throw  → status: 'failed', completedAt, error: err.message
5. Frontend polls GET /latest every 3 s until status is 'done' or 'failed'
6. Cron watchdog (every 1 min) marks audits stuck in 'running' > 5 min as 'failed'
```

This pattern works in a single process with no external queue. Copy it verbatim for Phase 5 (rank tracking) and Phase 6 (reporting).

### Crawl Constraints (architectural, not incidental)
- **Max 20 pages per audit run** — hard cap for HF Spaces resource limits
- **400 ms polite delay** between every HTTP request
- **10 s page-fetch timeout**, **5 s HEAD timeout** for broken-link checks
- **Max 50 unique internal links HEAD-checked** per audit (prevents hammering large sites)
- **5-minute audit timeout** — cron watchdog marks stuck audits failed
- robots.txt respected; fetch failure treated as "not found" (audit continues)
- Transparent User-Agent: `SEO-OS-Audit/1.0 (Technical SEO auditing tool)`

## Data Models Implemented So Far

| Model | Key fields |
|-------|-----------|
| `User` | email (unique), passwordHash, name, createdAt |
| `Workspace` | name, ownerId (→ User), members[{userId, role}], createdAt |
| `Site` | workspaceId (→ Workspace), domain (normalized), gscConnected, createdAt |
| `Audit` | siteId (→ Site), status (queued/running/done/failed), startedAt, completedAt, error, results{pagesCrawled, technical{...}} |

## API Routes Implemented So Far

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

All routes return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

## Known Limitations / Things Deliberately Cut
- Backlink Agent out of scope (no free reliable data source).
- Keyword difficulty is AI-estimated — label honestly in UI.
- Rank tracking uses Google Search Console API — never scrape Google SERPs.
- JWT is in-memory only — user re-logs in on page refresh (intentional).
- Audit crawl capped at 20 pages — intentional resource constraint.

## Environment Variables Needed

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `PORT` | optional | Backend port (default 5000; use 5001 locally) |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `GROQ_API_KEY` | ✅ | Groq API key for all AI calls (Phase 3+) |

## Next Phase
Phase 3 — Schema Agent + Internal Linking Agent: structured data (JSON-LD) analysis, internal link graph analysis, orphan page detection, anchor text diversity scoring, AI-powered recommendations via Groq.
