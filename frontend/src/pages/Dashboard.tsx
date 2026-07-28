import StatusCard from '../components/ui/StatusCard';
import RoadmapTable from '../components/ui/RoadmapTable';
import PalettePreview from '../components/ui/PalettePreview';

export default function Dashboard() {
  return (
    <div className="min-h-full p-6 lg:p-8 fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-widest uppercase text-clay bg-clay/10 border border-clay/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-clay animate-pulse" />
            Phase 0 — Scaffold
          </span>
        </div>
        <h1 className="font-heading text-2xl font-semibold text-cream mt-2 text-balance">
          SEO Operating System
        </h1>
        <p className="text-sage/70 text-sm mt-1 max-w-xl">
          AI-powered multi-agent SEO platform. Foundation scaffolding is complete —
          Auth, Workspaces &amp; Sites are next.
        </p>
      </div>

      {/* ── Status grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatusCard
          label="Backend"
          value="Express + MongoDB"
          sub="Node.js 20 · Port 5001"
          status="ready"
        />
        <StatusCard
          label="Frontend"
          value="React + Vite"
          sub="TypeScript · Tailwind CSS"
          status="ready"
        />
        <StatusCard
          label="AI Engine"
          value="Groq API"
          sub="Awaiting GROQ_API_KEY"
          status="pending"
        />
        <StatusCard
          label="Database"
          value="MongoDB"
          sub="Awaiting MONGO_URI"
          status="pending"
        />
      </div>

      {/* ── Two-col layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

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
    { key: 'MONGO_URI',     required: true,  set: false },
    { key: 'PORT',          required: false, set: false },
    { key: 'JWT_SECRET',    required: true,  set: false },
    { key: 'GROQ_API_KEY',  required: true,  set: false },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <h3 className="font-heading text-sm font-semibold text-cream mb-3">
        Environment Variables
      </h3>
      <div className="space-y-2">
        {vars.map((v) => (
          <div
            key={v.key}
            className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
          >
            <span className="font-mono text-xs text-sage/80">{v.key}</span>
            <div className="flex items-center gap-2">
              {v.required && (
                <span className="text-[9px] uppercase tracking-wide text-clay/70">required</span>
              )}
              <span
                className={`w-2 h-2 rounded-full ${
                  v.set ? 'bg-green-400' : 'bg-sage/30'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-sage/40 mt-3">
        Set these in Replit Secrets before running Phase 1.
      </p>
    </div>
  );
}
