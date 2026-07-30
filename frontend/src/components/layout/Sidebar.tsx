import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Logo from '../Logo';

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  phase: string;
  live: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Workspaces', icon: <GridIcon />, phase: 'Phase 1', live: true },
  { to: '/app/command-center', label: 'Command Center', icon: <DashIcon />, phase: 'Phase 1', live: true },
  { to: '/app/action-plan', label: 'Action Plan', icon: <PlanIcon />, phase: 'Phase 8', live: false },
  { to: '/app/keywords', label: 'Keyword Intelligence', icon: <SearchIcon />, phase: 'Phase 5', live: false },
  { to: '/app/content', label: 'Content Agent', icon: <PenIcon />, phase: 'Phase 5', live: false },
  { to: '/app/competitors', label: 'Competitor Analysis', icon: <CompIcon />, phase: 'Phase 6', live: false },
  { to: '/app/technical', label: 'Technical Audit', icon: <AuditIcon />, phase: 'Phase 2', live: false },
  { to: '/app/rank', label: 'Rank Tracker', icon: <ChartIcon />, phase: 'Phase 7', live: false },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <aside className="bg-navy flex w-64 flex-shrink-0 flex-col border-r border-white/[0.06]">
      {/* Logo */}
      <div className="border-b border-white/[0.06] px-5 py-5">
        <Logo variant="compact" theme="dark" />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="text-sage/40 mb-2 px-2 text-[9px] font-medium tracking-widest uppercase">Navigation</p>
        {NAV_ITEMS.map((item) =>
          item.live ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-clay/20 text-cream border-clay/30'
                    : 'text-sage/70 hover:text-cream border-transparent hover:bg-white/[0.04]'
                } `
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-clay' : 'text-sage/50 group-hover:text-sage'}`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${isActive ? 'bg-clay/30 text-clay' : 'text-sage/40 bg-white/[0.04]'}`}
                  >
                    {item.phase}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <div
              key={item.to}
              className="flex cursor-default items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 opacity-40"
              title="Coming in a future phase"
            >
              <span className="text-sage/40 h-4 w-4 flex-shrink-0">{item.icon}</span>
              <span className="text-sage/60 flex-1 text-sm font-medium">{item.label}</span>
              <span className="text-sage/30 rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium tracking-wide">
                {item.phase}
              </span>
            </div>
          ),
        )}
      </nav>

      {/* Footer — user + logout */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-clay/20 border-clay/20 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border">
            <span className="font-heading text-clay text-xs font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-cream/80 truncate text-xs">{user?.name ?? '—'}</p>
            <p className="text-sage/50 truncate text-[10px]">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-sage/40 hover:text-clay focus-visible:ring-clay rounded transition-colors focus-visible:ring-1 focus-visible:outline-none"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */
function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
function DashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <rect x="1" y="1" width="14" height="9" rx="1.5" />
      <line x1="4" y1="13" x2="12" y2="13" />
      <line x1="8" y1="10" x2="8" y2="13" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <line x1="9.9" y1="9.9" x2="14" y2="14" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z" />
    </svg>
  );
}
function PlanIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2M9 5a2 2 0 012-2h2M7 11l2 2 4-4" />
    </svg>
  );
}
function CompIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <circle cx="4" cy="8" r="3" />
      <circle cx="12" cy="8" r="3" />
      <line x1="7" y1="8" x2="9" y2="8" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <path d="M3 12l2.5-5 2.5 3 2.5-7L13 12" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <rect x="2" y="9" width="3" height="5" rx="0.5" />
      <rect x="6.5" y="5" width="3" height="9" rx="0.5" />
      <rect x="11" y="2" width="3" height="12" rx="0.5" />
    </svg>
  );
}
function ReportIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
      <rect x="2" y="1.5" width="12" height="13" rx="1.5" />
      <line x1="5" y1="5.5" x2="11" y2="5.5" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="10.5" x2="8.5" y2="10.5" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 11l3-3-3-3M13.5 8H6" />
    </svg>
  );
}
