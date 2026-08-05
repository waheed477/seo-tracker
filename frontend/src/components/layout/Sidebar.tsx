import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/api';

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  tag: string;
  live: boolean;
  requiresSite?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Workspaces', icon: <GridIcon />, tag: 'Live', live: true },
  { to: '/app/command-center', label: 'Command Center', icon: <DashIcon />, tag: 'Live', live: true },
  {
    to: '/app/sites/:siteId/action-plan',
    label: 'Action Plan',
    icon: <PlanIcon />,
    tag: 'Live',
    live: true,
    requiresSite: true,
  },
  {
    to: '/app/sites/:siteId/keywords',
    label: 'Keyword Intelligence',
    icon: <SearchIcon />,
    tag: 'Live',
    live: true,
    requiresSite: true,
  },
  {
    to: '/app/sites/:siteId/content',
    label: 'Content Agent',
    icon: <PenIcon />,
    tag: 'Live',
    live: true,
    requiresSite: true,
  },
  {
    to: '/app/sites/:siteId/competitors',
    label: 'Competitor Analysis',
    icon: <CompIcon />,
    tag: 'Live',
    live: true,
    requiresSite: true,
  },
  {
    to: '/app/sites/:siteId/audit',
    label: 'Technical Audit',
    icon: <AuditIcon />,
    tag: 'Live',
    live: true,
    requiresSite: true,
  },
  {
    to: '/app/sites/:siteId/rankings',
    label: 'Rank Tracker',
    icon: <ChartIcon />,
    tag: 'Live',
    live: true,
    requiresSite: true,
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const match = useMatch('/app/sites/:siteId/*');
  const currentSiteId = match?.params.siteId as string | undefined;

  function getItemLink(item: NavItem) {
    if (item.requiresSite && currentSiteId) {
      return item.to.replace(':siteId', currentSiteId);
    }
    return item.to;
  }

  function itemIsEnabled(item: NavItem) {
    return item.live && (!item.requiresSite || Boolean(currentSiteId));
  }

  function itemTag(item: NavItem) {
    if (item.requiresSite) {
      return currentSiteId ? 'Live' : 'Select site';
    }
    return item.tag;
  }

  async function handleLogout() {
    // Must hit the server: the access/refresh tokens live in httpOnly cookies
    // that JS cannot touch, so clearing local state alone leaves the session
    // alive — the next page load would silently sign the user back in.
    // Clear local state regardless of the network result so the UI never
    // strands the user on a page they think they've logged out of.
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }

  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-alt)] lg:w-60">
      {/* Nav — the brand/logo lives in the top navbar (Shell.tsx), not duplicated here */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 lg:px-3">
        <p className="mb-2 hidden px-2 text-[9px] font-medium tracking-widest text-[var(--color-text-tertiary)] uppercase lg:block">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const enabled = itemIsEnabled(item);
          const to = getItemLink(item);
          const disabledTitle = item.requiresSite && !currentSiteId ? 'Select a site first' : 'Coming soon';

          return enabled ? (
            <NavLink
              key={item.to}
              to={to}
              end={item.to === '/app' || item.to === '/app/command-center'}
              className={({ isActive }) =>
                `group flex w-full items-center justify-center gap-3 rounded-lg border px-2 py-2.5 text-left transition-all duration-150 lg:justify-start lg:px-3 ${
                  isActive
                    ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                } `
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]'}`}
                  >
                    {item.icon}
                  </span>
                  <span className="hidden flex-1 text-sm font-medium lg:block">{item.label}</span>
                  <span
                    className={`hidden rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wide lg:inline ${isActive ? 'bg-[var(--color-accent)]/25 text-[var(--color-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)]'}`}
                  >
                    {itemTag(item)}
                  </span>
                </>
              )}
            </NavLink>
          ) : (
            <div
              key={item.to}
              className="flex cursor-default items-center justify-center gap-3 rounded-lg border border-transparent px-2 py-2.5 opacity-40 lg:justify-start lg:px-3"
              title={disabledTitle}
            >
              <span className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]">{item.icon}</span>
              <span className="hidden flex-1 text-sm font-medium text-[var(--color-text-secondary)] lg:block">
                {item.label}
              </span>
              <span className="hidden rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[var(--color-text-tertiary)] lg:inline">
                {itemTag(item)}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Footer — user + logout */}
      <div className="border-t border-[var(--color-border)] px-2 py-4 lg:px-4">
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/15">
            <span className="font-heading text-xs font-semibold text-[var(--color-accent)]">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-xs text-[var(--color-text-primary)]">{user?.name ?? '—'}</p>
            <p className="truncate text-[10px] text-[var(--color-text-tertiary)]">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="rounded text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-accent)] focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
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
