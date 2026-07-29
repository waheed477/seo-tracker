# Project Context — SEO Operating System

## Current Status
Phase 1 complete: auth (register/login/JWT), User + Workspace + Site models, all CRUD routes, React Router + protected routes, Login/Register/Workspaces/Sites pages.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20 | LTS, native `--watch` flag for dev |
| Backend framework | Express 4 | Minimal, well-understood, single-process |
| ODM | Mongoose | Schema + validation on top of MongoDB |
| Auth | jsonwebtoken + bcrypt | Stateless JWT auth, bcrypt (12 rounds) for password hashing |
| HTTP client | axios | Used by crawl agent in later phases |
| HTML parsing | cheerio | Fast server-side jQuery-like parsing — no headless browser |
| Scheduler | node-cron | In-process cron — no Redis/BullMQ |
| Config | dotenv | 12-factor env var loading |
| CORS | cors | Cross-origin policy for frontend ↔ backend |
| AI | Groq API (via axios) | Ultra-fast LLM inference; all AI calls go through Groq |
| Frontend | React 18 + Vite + TypeScript | Fast DX, tree-shakeable bundles |
| Routing | React Router v6 | Client-side routing with protected route guard |
| Styling | Tailwind CSS v4 | Utility-first; design tokens in CSS `@theme` block |
| State | Zustand | Auth store (in-memory JWT); lightweight, no boilerplate |
| Charts | Recharts | Composable chart primitives |
| Fonts | Space Grotesk (headings) + Inter (body) | Confident/technical SaaS feel |

## Architecture Decisions
- **No Puppeteer** — crawling uses axios + cheerio only (HF Spaces Docker compatibility)
- **No Redis / BullMQ** — scheduled jobs run in-process with node-cron (single-process design)
- **Single exposed port** — backend defaults to `PORT || 5000` (matches spec). In local dev where Vite already occupies 5000, set `PORT=5001` in `backend/.env`; in production (HF Spaces) one process owns port 5000 and serves the Vite build as static files from Express (wired in a later phase)
- **Stateless JWT** — no server-side session store; tokens carry `{ id, email, name }`
- **JWT stored in-memory (Zustand)** — never in `localStorage` or cookies; eliminates XSS token-theft risk. Trade-off: user is logged out on page refresh. Upgrade path: httpOnly cookies set server-side (see below)
- **Backlink Agent omitted** — no free reliable data source; architecture allows plugging in a paid provider later
- **Keyword difficulty is AI-estimated** — must be labeled honestly in the UI, never presented as real SERP data
- **Rank tracking via Google Search Console API** — never scrape Google SERPs directly

### JWT storage rationale
The spec asked for in-memory storage to avoid XSS. Zustand store holds `{ token, user }` in RAM. On refresh the user must re-login. The preferred future upgrade for "remember me" is an httpOnly, SameSite=Strict cookie set by the Express `/api/auth/login` response — this keeps the token out of JavaScript entirely and survives refresh. Not implemented yet to keep Phase 1 scope tight.

## Data Models Implemented So Far

| Model | Key fields |
|-------|-----------|
| `User` | email (unique), passwordHash, name, createdAt |
| `Workspace` | name, ownerId (→ User), members[{userId, role}], createdAt |
| `Site` | workspaceId (→ Workspace), domain (normalized), gscConnected, createdAt |

## API Routes Implemented So Far

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Server + DB status |
| POST | `/api/auth/register` | — | Register, returns JWT |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/workspaces` | ✅ | Create workspace (creator = owner) |
| GET | `/api/workspaces` | ✅ | List workspaces for logged-in user |
| POST | `/api/workspaces/:id/members` | ✅ owner/admin | Add member by email |
| POST | `/api/sites` | ✅ + member check | Add site to workspace |
| GET | `/api/sites?workspaceId=` | ✅ + member check | List sites in workspace |
| GET | `/api/sites/:id` | ✅ + member check | Get one site |

All routes return `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

## Known Limitations / Things Deliberately Cut
- Backlink Agent is out of scope (no free reliable data source).
- Keyword difficulty is AI-estimated — label honestly in UI, not as real SERP data.
- Rank tracking uses Google Search Console API — never scrape Google SERPs.
- JWT is in-memory only — user is logged out on page refresh (intentional for Phase 1).

## Environment Variables Needed

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `PORT` | optional | Backend port (default 5000; use 5001 locally) |
| `JWT_SECRET` | ✅ | Secret for signing JWTs (use a long random string) |
| `GROQ_API_KEY` | ✅ | Groq API key for all AI calls (Phase 2+) |

## Next Phase
Phase 2 — Technical SEO Agent + Audit Pipeline: site crawler (axios + cheerio), meta/heading/link analysis, technical issue detection, audit results stored in MongoDB, audit UI in the frontend.
