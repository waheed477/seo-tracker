# Project Context — SEO Operating System

## Current Status
Phase 0 complete: monorepo skeleton created, backend scaffolded, frontend scaffolded with design system.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20 | LTS, native `--watch` flag for dev |
| Backend framework | Express 4 | Minimal, well-understood, single-process |
| ODM | Mongoose | Schema + validation on top of MongoDB |
| Auth | jsonwebtoken + bcrypt | Stateless JWT auth, bcrypt for password hashing |
| HTTP client | axios | Fetch + streaming, used by crawl agent |
| HTML parsing | cheerio | Fast server-side jQuery-like parsing — no headless browser |
| Scheduler | node-cron | In-process cron — no Redis/BullMQ |
| Config | dotenv | 12-factor env var loading |
| CORS | cors | Cross-origin policy for frontend ↔ backend |
| AI | Groq API (via axios) | Ultra-fast LLM inference; all AI calls go through Groq |
| Frontend | React 18 + Vite + TypeScript | Fast DX, tree-shakeable bundles |
| Styling | Tailwind CSS | Utility-first; design tokens as Tailwind theme colors |
| State | Zustand | Lightweight, no boilerplate |
| Charts | Recharts | Composable chart primitives |
| Fonts | Space Grotesk (headings) + Inter (body) | Confident/technical SaaS feel |

## Architecture Decisions
- **No Puppeteer** — crawling uses axios + cheerio only (HF Spaces Docker compatibility)
- **No Redis / BullMQ** — scheduled jobs run in-process with node-cron (single-process design)
- **Single exposed port** — backend defaults to `PORT || 5000` (matches spec). In local dev where Vite already occupies 5000, set `PORT=5001` in `.env`; in production (HF Spaces) one process owns port 5000 and serves the Vite build as static files from Express (to be wired in a later phase)
- **Stateless JWT** — no server-side session store; tokens carry workspace context
- **Backlink Agent omitted** — no free reliable data source; architecture allows plugging in a paid provider later
- **Keyword difficulty is AI-estimated** — must be labeled honestly in the UI, never presented as real SERP data
- **Rank tracking via Google Search Console API** — never scrape Google SERPs directly

## Data Models Implemented So Far
*(none yet — Phase 1 will introduce User, Workspace, Site)*

## API Routes Implemented So Far
- `GET /api/health` — returns server status + MongoDB connection state

## Known Limitations / Things Deliberately Cut
- Backlink Agent is out of scope for this build (no free reliable data source) — architecture should allow plugging in a paid provider later if needed, but don't build it now.
- Keyword difficulty is AI-estimated, not from real search volume data — must be labeled honestly in the UI later, not presented as real SERP data.
- Rank tracking will use Google Search Console's real API data — never scrape Google search results pages directly, under any circumstances, even if it seems easier.

## Environment Variables Needed

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `PORT` | optional | Backend port (defaults to 5001) |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `GROQ_API_KEY` | ✅ | Groq API key for all AI calls |

## Next Phase
Phase 1 — Auth, Workspaces, Sites: user registration/login (JWT), workspace model, site CRUD, protected routes on the frontend.
