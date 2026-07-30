/**
 * Footer.tsx — Professional footer for SEO Operating System.
 *
 * 4-column layout on desktop, stacked on mobile.
 * Appears on all pages (login, register, authenticated pages).
 * Does NOT appear on distraction-free views (none currently exist).
 *
 * Uses theme colours only: navy, cream, sage, clay.
 */

import { Link } from 'react-router-dom';
import Logo from './Logo';

/* ── Column link helper ───────────────────────────────────────────────────── */
function FooterLink({ to, children, external = false }: { to: string; children: React.ReactNode; external?: boolean }) {
  const cls = 'text-sage/60 hover:text-cream transition-colors text-sm leading-relaxed';
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy border-t border-white/[0.06]">
      {/* 4-column grid */}
      <div className="mx-auto max-w-6xl px-6 py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Column 1 — Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo variant="full" theme="dark" />
            <p className="text-sage/60 mt-3 max-w-xs text-sm leading-relaxed">
              AI-powered multi-agent SEO platform. Audit, analyse, and act — all in one place.
            </p>
          </div>

          {/* Column 2 — Product */}
          <div>
            <h3 className="font-heading text-cream/80 mb-3 text-xs font-semibold tracking-wider uppercase">Product</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink to="/app/command-center">Command Center</FooterLink>
              </li>
              <li>
                <FooterLink to="/app">Audits</FooterLink>
              </li>
              <li>
                <FooterLink to="/app">Keywords</FooterLink>
              </li>
              <li>
                <FooterLink to="/app">Competitors</FooterLink>
              </li>
              <li>
                <FooterLink to="/app">Action Plan</FooterLink>
              </li>
            </ul>
          </div>

          {/* Column 3 — Company */}
          <div>
            <h3 className="font-heading text-cream/80 mb-3 text-xs font-semibold tracking-wider uppercase">Company</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink to="/contact">Contact</FooterLink>
              </li>
              <li>
                <span className="text-sage/30 cursor-default text-sm">About</span>
                <span className="text-sage/20 ml-1.5 text-[9px] tracking-wider uppercase">coming soon</span>
              </li>
              <li>
                <span className="text-sage/30 cursor-default text-sm">Blog</span>
                <span className="text-sage/20 ml-1.5 text-[9px] tracking-wider uppercase">coming soon</span>
              </li>
            </ul>
          </div>

          {/* Column 4 — Legal */}
          <div>
            <h3 className="font-heading text-cream/80 mb-3 text-xs font-semibold tracking-wider uppercase">Legal</h3>
            <ul className="space-y-2">
              <li>
                <FooterLink to="/privacy-policy">Privacy Policy</FooterLink>
              </li>
              <li>
                <FooterLink to="/terms-of-service">Terms of Service</FooterLink>
              </li>
              <li>
                <FooterLink to="/security">Security</FooterLink>
              </li>
              <li>
                <FooterLink to="/cookie-policy">Cookie Policy</FooterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-sage/20 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
          <p className="text-sage/50 text-xs">© {year} SEO Operating System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {/* GitHub — real link since this is a portfolio project */}
            <a
              href="https://github.com/waheed000/seo-operator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage/40 hover:text-cream transition-colors"
              title="GitHub"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4.5 w-4.5">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
