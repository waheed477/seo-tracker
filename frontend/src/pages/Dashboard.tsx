import StatusCard from '../components/ui/StatusCard';
import RoadmapTable from '../components/ui/RoadmapTable';
import PalettePreview from '../components/ui/PalettePreview';

export default function Dashboard() {
  return (
    <div className="fade-in min-h-full p-6 lg:p-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-clay bg-clay/10 border-clay/20 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-widest uppercase">
            <span className="bg-clay h-1.5 w-1.5 animate-pulse rounded-full" />
            Phase 0 — Scaffold
          </span>
        </div>
        <h1 className="font-heading text-cream mt-2 text-2xl font-semibold text-balance">SEO Operating System</h1>
        <p className="text-sage/70 mt-1 max-w-xl text-sm">
          AI-powered multi-agent SEO platform. Foundation scaffolding is complete — Auth, Workspaces &amp; Sites are
          next.
        </p>
      </div>

      {/* ── Status grid ─────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard label="Backend" value="Express + MongoDB" sub="Node.js 20 · Port 5001" status="ready" />
        <StatusCard label="Frontend" value="React + Vite" sub="TypeScript · Tailwind CSS" status="ready" />
        <StatusCard label="AI Engine" value="Groq API" sub="Awaiting GROQ_API_KEY" status="pending" />
        <StatusCard label="Database" value="MongoDB" sub="Awaiting MONGO_URI" status="pending" />
      </div>

      {/* ── Two-col layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roadmap */}
        <div className="lg:col-span-2">
          <RoadmapTable />
        </div>

        {/* Design tokens + env vars */}
        <div className="space-y-5">
          <PalettePreview />
          <EnvVarPanel />
        </div>
      </div>
    </div>
  );
}

function EnvVarPanel() {
  const vars = [
    { key: 'MONGO_URI', required: true, set: false },
    { key: 'PORT', required: false, set: false },
    { key: 'JWT_SECRET', required: true, set: false },
    { key: 'GROQ_API_KEY', required: true, set: false },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h3 className="font-heading text-cream mb-3 text-sm font-semibold">Environment Variables</h3>
      <div className="space-y-2">
        {vars.map((v) => (
          <div
            key={v.key}
            className="flex items-center justify-between border-b border-white/[0.04] py-1.5 last:border-0"
          >
            <span className="text-sage/80 font-mono text-xs">{v.key}</span>
            <div className="flex items-center gap-2">
              {v.required && <span className="text-clay/70 text-[9px] tracking-wide uppercase">required</span>}
              <span className={`h-2 w-2 rounded-full ${v.set ? 'bg-green-400' : 'bg-sage/30'}`} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-sage/40 mt-3 text-[10px]">Set these in Replit Secrets before running Phase 1.</p>
    </div>
  );
}
