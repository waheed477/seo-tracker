import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  phase: string;
  live: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/',                label: 'Workspaces',          icon: <GridIcon />,   phase: 'Phase 1', live: true  },
  { to: '/command-center',  label: 'Command Center',      icon: <DashIcon />,   phase: 'Phase 1', live: true  },
  { to: '/keywords',        label: 'Keyword Intelligence',icon: <SearchIcon />, phase: 'Phase 2', live: false },
  { to: '/content',         label: 'Content Agent',       icon: <PenIcon />,    phase: 'Phase 3', live: false },
  { to: '/technical',       label: 'Technical Audit',     icon: <AuditIcon />,  phase: 'Phase 4', live: false },
  { to: '/rank',            label: 'Rank Tracker',        icon: <ChartIcon />,  phase: 'Phase 5', live: false },
  { to: '/reports',         label: 'Reports',             icon: <ReportIcon />, phase: 'Phase 6', live: false },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-navy border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-clay flex items-center justify-center flex-shrink-0">
            <span className="text-cream font-heading font-bold text-sm">S</span>
          </div>
          <div>
            <p className="font-heading font-semibold text-cream text-sm leading-tight">SEO OS</p>
            <p className="text-[10px] text-sage/70 tracking-wider uppercase mt-0.5">Operating System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[9px] tracking-widest uppercase text-sage/40 font-medium">Navigation</p>
        {NAV_ITEMS.map(item => (
          item.live ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left
                transition-all duration-150 group border
                ${isActive
                  ? 'bg-clay/20 text-cream border-clay/30'
                  : 'text-sage/70 hover:bg-white/[0.04] hover:text-cream border-transparent'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-clay' : 'text-sage/50 group-hover:text-sage'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide ${isActive ? 'bg-clay/30 text-clay' : 'bg-white/[0.04] text-sage/40'}`}>
                    {item.phase}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <div
              key={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent opacity-40 cursor-default"
              title="Coming in a future phase"
            >
              <span className="w-4 h-4 flex-shrink-0 text-sage/40">{item.icon}</span>
              <span className="flex-1 text-sm font-medium text-sage/60">{item.label}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide bg-white/[0.04] text-sage/30">
                {item.phase}
              </span>
            </div>
          )
        ))}
      </nav>

      {/* Footer — user + logout */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-clay/20 border border-clay/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-heading font-semibold text-clay">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cream/80 truncate">{user?.name ?? '—'}</p>
            <p className="text-[10px] text-sage/50 truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-sage/40 hover:text-clay transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-clay rounded"
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
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>;
}
function DashIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><rect x="1" y="1" width="14" height="9" rx="1.5" /><line x1="4" y1="13" x2="12" y2="13" /><line x1="8" y1="10" x2="8" y2="13" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><circle cx="6.5" cy="6.5" r="4.5" /><line x1="9.9" y1="9.9" x2="14" y2="14" /></svg>;
}
function PenIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><path d="M10.5 2.5l3 3L5 14H2v-3L10.5 2.5z" /></svg>;
}
function AuditIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><path d="M3 12l2.5-5 2.5 3 2.5-7L13 12" /></svg>;
}
function ChartIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><rect x="2" y="9" width="3" height="5" rx="0.5" /><rect x="6.5" y="5" width="3" height="9" rx="0.5" /><rect x="11" y="2" width="3" height="12" rx="0.5" /></svg>;
}
function ReportIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full"><rect x="2" y="1.5" width="12" height="13" rx="1.5" /><line x1="5" y1="5.5" x2="11" y2="5.5" /><line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="10.5" x2="8.5" y2="10.5" /></svg>;
}
function LogoutIcon() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10.5 11l3-3-3-3M13.5 8H6" /></svg>;
}
