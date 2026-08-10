# SEO Operating System

> An AI-powered, multi-agent SEO platform that audits websites, researches keywords, analyzes competitors, tracks real Google rankings, and synthesizes it all into a prioritized action plan — built as a full-stack MERN application with a production-grade architecture.

**Live Demo:** [https://seo-tracker-drq6.onrender.com/](https://seo-tracker-drq6.onrender.com/)

**Repository:** [github.com/waheed477/seo-tracker](https://github.com/waheed477/seo-tracker)

---------------------------------------

## 📋 Overview

SEO Operating System replaces the usual stack of 5–6 disconnected SEO tools with a single platform. It crawls a site, runs AI-powered analysis across multiple specialized agents, and produces a prioritized, data-backed action plan — not generic advice, but recommendations tied to the specific issues actually found on that site.

---

## ✨ Features

- **🔍 Technical SEO Audit** — Crawls up to 20 pages per site, checks meta tags, heading structure, image alt text, broken internal links, robots.txt, and sitemap.xml
- **🔑 Keyword Research Agent** — AI-clusters seed keywords by topic, assigns search intent, and estimates difficulty (clearly labeled as an AI estimate, not live search data)
- **📝 Content SEO Agent** — Analyzes pasted content for keyword usage, structure, and readability with actionable suggestions
- **🏆 Competitor Gap Analysis** — Crawls a competitor's public pages and identifies content topics they cover that you don't, with AI-generated reasoning
- **📈 Real Rank Tracking** — Official Google Search Console API integration (OAuth2) — no SERP scraping, ever
- **🎯 AI Action Plan** — Synthesizes data from every other agent into a single prioritized, data-specific to-do list
- **🔔 Notifications** — Workspace-scoped alerts when async jobs (audits, reports, plans) complete
- **🌓 Light/Dark Theme** — Fully theme-aware UI across the entire app, including a custom animated landing page
- **🔐 Persistent Sessions** — httpOnly cookies with rotating refresh tokens (no localStorage JWT, no logout-on-refresh)

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 20 | LTS, stable |
| Backend framework | Express | Minimal, single-process |
| Database | MongoDB + Mongoose | Schema validation, flexible documents |
| Auth | JWT (access + rotating refresh tokens) + bcrypt | Stateless, httpOnly-cookie based, XSS-resistant |
| Crawling | axios + cheerio | No headless browser — lightweight, hosting-compatible |
| Scheduler | node-cron (in-process) | No Redis/BullMQ — single-process architecture |
| AI | Groq API | Fast LLM inference for all agent reasoning |
| Encryption | AES-256-CBC | Encrypts Google refresh tokens at rest |
| OAuth | Google APIs (Search Console) | Official API only — no scraping |
| Payments | Stripe (test mode, currently disabled) | Checkout, webhooks, billing portal — built and functional, temporarily gated off via a feature flag |
| Email | Resend (HTTPS API) | Password reset — no SMTP (host-compatible) |
| Frontend | React + Vite + TypeScript | Fast dev experience, type safety |
| Styling | Tailwind CSS | Utility-first, custom design tokens |
| State | Zustand | Lightweight global state |
| Charts | Recharts | Ranking trend visualization |
| Deployment | Docker (single combined image) → Render | Frontend + backend served from one process |

---

## 🏗️ Architecture Highlights

- **Single-process design** — No Redis, no external queue, no headless browser. Async jobs (audits, reports, action plans) use a fire-and-forget pattern with status polling and a cron watchdog for stuck-job recovery.
- **Container-restart safety** — A startup sweep marks any job left `running` after a crash as `failed`, so nothing is ever permanently stuck.
- **Security-conscious by default** — Passwords hashed with bcrypt, GSC refresh tokens AES-256 encrypted, sessions via httpOnly cookies with rotation, explicit CORS (no wildcard origins), and honest (non-enumerable) password reset responses.
- **Honest data labeling** — AI-estimated keyword difficulty is explicitly labeled as an estimate; real ranking data is clearly sourced from Google's official API.
- **No third-party scraping** — Competitor analysis crawls only publicly accessible pages via HTTP, respecting `robots.txt` and rate-limiting itself — the same method used for auditing the user's own site.

---

## 🚀 Local Setup

### Prerequisites
- Node.js 20+
- A MongoDB connection (local or Atlas)
- API keys: Groq, Google Cloud (OAuth + PageSpeed), Stripe (test mode), Resend

### Steps


# Clone the repo
git clone https://github.com/waheed477/seo-tracker.git
cd seo-tracker

# Install backend dependencies
cd backend
npm install
cp .env.example .env   # fill in your own values

# Install frontend dependencies
cd ../frontend
npm install
cp .env.example .env   # fill in your own values

# Run both (separate terminals)
cd backend && npm run dev
cd frontend && npm run dev


See `backend/.env.example` and `frontend/.env.example` for the full list of required environment variables.

---

## 🧪 Testing


# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
-------------------------------

- Backend: Jest + Supertest, with `mongodb-memory-server` for isolated test runs
- Frontend: Vitest + React Testing Library
- All external API calls (Groq, Stripe, Google, Resend) are mocked in tests — no real network calls during test runs
- CI runs the full suite on every push via GitHub Actions



## 📦 Deployment

Deployed as a single Docker container that builds the React frontend and serves both the static assets and the Express API from one process, hosted on Render. This keeps frontend and backend same-origin, simplifying CORS and cookie handling.

---

## ⚠️ Known Limitations

- **Billing is temporarily disabled** — the full Stripe subscription flow (Checkout, webhooks, plan lifecycle, billing portal) is built and tested, but is currently gated off via a `BILLING_ENABLED` feature flag while Stripe configuration is finalized. All features are unrestricted in the meantime. Re-enabling requires no code changes — just flipping the flag.
- **Google Search Console requires a verified property** — rank tracking only shows real data for domains the connected Google account has actually verified in Search Console; this is a Google requirement, not an app limitation
- **No rate limiting on API routes yet** — planned for a production hardening pass
- **No password reset via SMS**, email only (via Resend's HTTPS API, chosen specifically for compatibility with containerized hosting that restricts SMTP)
- **Backlink analysis is out of scope** — no reliable free data source exists; the architecture allows plugging in a paid provider later

---

## 📁 Project Structure


seo-tracker/
├── backend/
│   ├── server/         # App entry point
│   ├── routes/         # Express route handlers
│   ├── models/         # Mongoose schemas
│   ├── services/agents/ # AI agent logic (audit, keywords, content, competitor, action plan)
│   ├── middleware/      # Auth, validation
│   ├── jobs/            # Cron jobs (watchdogs, cleanup, GSC sync)
│   └── tests/           # Jest unit + integration tests
├── frontend/
│   └── src/
│       ├── pages/        # Route-level page components
│       ├── components/   # Reusable UI (Logo, Footer, Badge, etc.)
│       ├── store/        # Zustand stores
│       └── api/          # Centralized API client
└── Dockerfile            # Combined single-image build (frontend + backend)


------------------------------------

## 📄 License

MIT — see [LICENSE](./LICENSE) for details.

---

## 👤 Author

**Waheed** — [GitHub](https://github.com/waheed477) · [LinkedIn](https://www.linkedin.com/in/waheed-aslam-5a9208372) 

Built as a portfolio project to demonstrate full-stack architecture, third-party OAuth integration, AI-agent design, and production-oriented engineering decisions.
