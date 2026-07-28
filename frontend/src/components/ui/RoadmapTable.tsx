type PhaseStatus = 'complete' | 'next' | 'upcoming';

interface Phase {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  features: string[];
}

const PHASES: Phase[] = [
  {
    id: '0',
    name: 'Phase 0',
    description: 'Foundation Scaffold',
    status: 'complete',
    features: ['Monorepo structure', 'Express + MongoDB setup', 'Vite React + Tailwind', 'Design system tokens'],
  },
  {
    id: '1',
    name: 'Phase 1',
    description: 'Auth, Workspaces & Sites',
    status: 'next',
    features: ['JWT auth (register / login)', 'User workspaces model', 'Site management CRUD', 'Protected route guards'],
  },
  {
    id: '2',
    name: 'Phase 2',
    description: 'Keyword Intelligence Agent',
    status: 'upcoming',
    features: ['Keyword discovery (Groq)', 'Cluster & intent grouping', 'AI-estimated difficulty', 'Keyword dashboard'],
  },
  {
    id: '3',
    name: 'Phase 3',
    description: 'Content Agent',
    status: 'upcoming',
    features: ['Content brief generation', 'On-page SEO analysis', 'Tone & structure scoring', 'Revision loop'],
  },
  {
    id: '4',
    name: 'Phase 4',
    description: 'Technical Audit Agent',
    status: 'upcoming',
    features: ['Site crawl (axios + cheerio)', 'Broken links & redirects', 'Meta / heading analysis', 'Speed hints'],
  },
  {
    id: '5',
    name: 'Phase 5',
    description: 'Rank Tracker',
    status: 'upcoming',
    features: ['Google Search Console API', 'Historic position tracking', 'SERP delta alerts', 'Trend charts'],
  },
];

const statusBadge: Record<PhaseStatus, string> = {
  complete: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50',
  next:     'bg-clay/20 text-clay border-clay/30',
  upcoming: 'bg-white/[0.04] text-sage/50 border-white/[0.06]',
};

const statusLabel: Record<PhaseStatus, string> = {
  complete: 'Complete',
  next:     'Up Next',
  upcoming: 'Upcoming',
};

export default function RoadmapTable() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-cream">Build Roadmap</h3>
        <span className="text-[10px] text-sage/40">6 phases · 1 complete</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {PHASES.map((phase) => (
          <div
            key={phase.id}
            className={`
              px-5 py-4 flex gap-4 items-start
              transition-colors hover:bg-white/[0.02]
              ${phase.status === 'complete' ? 'opacity-70' : ''}
            `}
          >
            {/* Phase indicator */}
            <div className="flex-shrink-0 pt-0.5">
              <div
                className={`
                  w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-heading font-bold
                  ${
                    phase.status === 'complete'
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : phase.status === 'next'
                      ? 'bg-clay/20 text-clay'
                      : 'bg-white/[0.04] text-sage/40'
                  }
                `}
              >
                {phase.status === 'complete' ? '✓' : phase.id}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-heading text-sm font-semibold text-cream">
                  {phase.name}
                </span>
                <span className="text-sage/50 text-xs">·</span>
                <span className="text-xs text-sage/70">{phase.description}</span>
                <span
                  className={`
                    ml-auto text-[9px] tracking-wider uppercase font-medium
                    px-2 py-0.5 rounded-full border
                    ${statusBadge[phase.status]}
                  `}
                >
                  {statusLabel[phase.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {phase.features.map((f) => (
                  <span
                    key={f}
                    className="text-[10px] bg-white/[0.04] text-sage/60 px-2 py-0.5 rounded border border-white/[0.04]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
