import { useState } from 'react';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  phase: string;
  status: 'active' | 'upcoming';
};

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Command Center',
    icon: <GridIcon />,
    phase: 'Phase 1',
    status: 'upcoming',
  },
  {
    id: 'sites',
    label: 'Sites & Workspaces',
    icon: <GlobeIcon />,
    phase: 'Phase 1',
    status: 'upcoming',
  },
  {
    id: 'keywords',
    label: 'Keyword Intelligence',
    icon: <SearchIcon />,
    phase: 'Phase 2',
    status: 'upcoming',
  },
  {
    id: 'content',
    label: 'Content Agent',
    icon: <PenIcon />,
    phase: 'Phase 3',
    status: 'upcoming',
  },
  {
    id: 'technical',
    label: 'Technical Audit',
    icon: <AuditIcon />,
    phase: 'Phase 4',
    status: 'upcoming',
  },
  {
    id: 'rank',
    label: 'Rank Tracker',
    icon: <ChartIcon />,
    phase: 'Phase 5',
    status: 'upcoming',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <ReportIcon />,
    phase: 'Phase 6',
    status: 'upcoming',
  },
];

export default function Sidebar() {
  const [active, setActive] = useState('dashboard');

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-navy border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-clay flex items-center justify-center flex-shrink-0">
            <span className="text-cream font-heading font-bold text-sm leading-none">S</span>
          </div>
          <div>
            <p className="font-heading font-semibold text-cream text-sm leading-tight">SEO OS</p>
            <p className="text-[10px] text-sage/70 tracking-wider uppercase leading-tight mt-0.5">
              Operating System
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[9px] tracking-widest uppercase text-sage/50 font-medium">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
              transition-all duration-150 group
              ${
                active === item.id
                  ? 'bg-clay/20 text-cream border border-clay/30'
                  : 'text-sage/70 hover:bg-white/[0.04] hover:text-cream border border-transparent'
              }
            `}
          >
            <span
              className={`
                w-4 h-4 flex-shrink-0 transition-colors
                ${active === item.id ? 'text-clay' : 'text-sage/50 group-hover:text-sage'}
              `}
            >
              {item.icon}
            </span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <span
              className={`
                text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide
                ${
                  active === item.id
                    ? 'bg-clay/30 text-clay'
                    : 'bg-white/[0.04] text-sage/40'
                }
              `}
            >
              {item.phase}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-heading text-sage">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cream/70 truncate">user@example.com</p>
            <p className="text-[10px] text-sage/50">Free tier</p>
          </div>
          <button className="text-sage/40 hover:text-clay transition-colors">
            <SettingsIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ── Inline SVG icons (keeps bundle zero-dep for Phase 0) ──────────────────── */
function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="8" cy="8" r="6.5" />
      <ellipse cx="8" cy="8" rx="2.5" ry="6.5" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <line x1="9.9" y1="9.9" x2="14" y2="14" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M3 12l2.5-5 2.5 3 2.5-7L13 12" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <rect x="2" y="9" width="3" height="5" rx="0.5" />
      <rect x="6.5" y="5" width="3" height="9" rx="0.5" />
      <rect x="11" y="2" width="3" height="12" rx="0.5" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <rect x="2" y="1.5" width="12" height="13" rx="1.5" />
      <line x1="5" y1="5.5" x2="11" y2="5.5" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="10.5" x2="8.5" y2="10.5" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.54 11.54l1.41 1.41M3.05 12.95l1.42-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  );
}
