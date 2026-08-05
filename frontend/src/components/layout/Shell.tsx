import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../ui/NotificationBell';
import ToastContainer from '../ui/Toast';
import ErrorBoundary from '../ui/ErrorBoundary';
import Logo from '../Logo';
import ThemeToggle from '../ThemeToggle';

/**
 * Shell — layout for all authenticated /app/* routes.
 *
 * Structure:
 *   ┌──────────────────────────────────────────────┐
 *   │ AppNavbar (full width, sticky)               │  ← brand sits top-left, above the sidebar
 *   ├────────────┬─────────────────────────────────┤
 *   │ Sidebar    │ main (scrolls)                  │
 *   └────────────┴─────────────────────────────────┘
 *
 * There is deliberately NO <Footer /> here — the marketing footer belongs to
 * the landing/login/register pages only. Its useful destinations (Billing,
 * Support) live in the navbar instead. Legal links stay on the landing footer.
 */
export default function Shell() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <AppNavbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

/* ── Top navbar ───────────────────────────────────────────────────────────── */
function AppNavbar() {
  return (
    <header className="sticky top-0 z-40 flex flex-shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-3 py-2.5 backdrop-blur-md sm:px-4">
      {/* Brand — top-left corner, aligned over the sidebar column */}
      <Link
        to="/app"
        className="flex shrink-0 items-center gap-2.5 rounded-lg pr-2 transition-opacity hover:opacity-80 lg:w-60"
        title="SEO Operating System"
      >
        <Logo variant="compact" />
        <span className="font-heading hidden text-sm font-semibold whitespace-nowrap text-[var(--color-text-primary)] sm:inline">
          SEO Operating System
        </span>
      </Link>

      <div className="flex-1" />

      {/* Right-aligned controls */}
      <nav className="flex items-center gap-0.5 sm:gap-1">
        <NavbarLink to="/app/billing" label="Billing" title="Billing & plans">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
            <line x1="1.5" y1="6.5" x2="14.5" y2="6.5" />
          </svg>
        </NavbarLink>

        <NavbarLink to="/contact" label="Support" title="Contact & support">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M6.2 6.2a1.9 1.9 0 113.1 1.5c-.6.4-1.3.8-1.3 1.6" />
            <circle cx="8" cy="11.6" r="0.6" fill="currentColor" stroke="none" />
          </svg>
        </NavbarLink>

        <ThemeToggle />
        <NotificationBell />
      </nav>
    </header>
  );
}

/* ── Navbar link — icon always, label on wider screens ────────────────────── */
function NavbarLink({
  to,
  label,
  title,
  children,
}: {
  to: string;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
    >
      {children}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
