# SEO Operating System

AI-powered multi-agent SEO platform. MERN stack monorepo.

## Structure

```
/
├── backend/          Express + MongoDB API (port 5001)
│   └── server/
│       └── index.js  Entry point
├── frontend/         Vite + React + TypeScript (port 5000)
│   └── src/
│       ├── App.tsx
│       ├── components/
│       └── pages/
├── project_context.md  Living architecture doc — update every phase
└── package.json        Root scripts (runs both services via concurrently)
```

## How to Run

The workflow runs the Vite frontend on port 5000. The backend can be started separately.

- **Frontend only** (default preview): `cd frontend && vite --port 5000 --host 0.0.0.0`
- **Both services**: `npm run dev` from root (uses concurrently)
- **Backend only**: `npm run dev:backend` from root

## Environment Variables

Set these in **Replit Secrets** before Phase 1:

| Key | Purpose |
|-----|---------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret for JWT signing |
| `GROQ_API_KEY` | Groq API key for AI calls |
| `PORT` | Backend port (optional, defaults to 5001) |

## Tech Stack

- Backend: Node.js 20, Express, Mongoose, JWT, bcrypt, axios, cheerio, node-cron
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Zustand, Recharts
- AI: Groq API (all AI calls)
- No Puppeteer · No Redis/BullMQ · Single-process design

## User Preferences

- Unique, polished UI/UX — not generic
- Tailwind color tokens only: `bg-navy`, `text-cream`, `bg-sage`, `bg-clay` — never raw hex in components
- Space Grotesk for headings, Inter for body text
- Dark mode default (navy bg, cream text)
