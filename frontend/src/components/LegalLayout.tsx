/**
 * LegalLayout — shared wrapper for static legal/trust pages.
 *
 * Provides consistent navy background, cream text, max-width content area,
 * back navigation, and the <Logo /> component at the top.
 */

import { Link } from 'react-router-dom';
import Logo from './Logo';

interface LegalLayoutProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="bg-[var(--color-bg)] text-[var(--color-text-primary)] min-h-screen relative">
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent-rgb),0.06)_0%,transparent_50%)]" />

      <div className="relative mx-auto max-w-3xl px-6 py-12 lg:py-16">
        {/* Logo + back link */}
        <div className="mb-10 flex items-center justify-between">
          <Link to="/app" className="group">
            <Logo variant="compact" theme="dark" />
          </Link>
          <Link to="/app" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 text-xs transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
              <path d="M10 4L6 8l4 4" />
            </svg>
            Back to app
          </Link>
        </div>

        {/* Title */}
        <h1 className="font-heading text-[var(--color-text-primary)] mb-2 text-2xl font-semibold lg:text-3xl">{title}</h1>
        {lastUpdated && <p className="text-[var(--color-text-secondary)] mb-8 text-xs">Last updated: {lastUpdated}</p>}

        {/* Content */}
        <div className="space-y-6 text-[var(--color-text-secondary)] text-sm leading-relaxed">{children}</div>

        {/* Bottom back link */}
        <div className="mt-12 border-t border-[var(--color-border)] pt-6">
          <Link to="/app" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] text-sm transition-colors">
            ← Back to SEO Operating System
          </Link>
        </div>
      </div>
    </div>
  );
}
