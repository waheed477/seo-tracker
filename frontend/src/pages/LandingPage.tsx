import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import ThemeToggle from '../components/ThemeToggle';
import LandingBackground from '../components/LandingBackground';
import WelcomeTour from '../components/WelcomeTour';

/* ── Scroll entrance hook ─────────────────────────────────────────────────────
   Adds the `anim-in` class the first time an element scrolls into view, which
   triggers its keyframe entrance (see .anim-* rules in index.css). One-shot. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('anim-in');
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Entrance-animated wrapper ─────────────────────────────────────────────────
   dir gives each element type its consistent motion signature:
     'up'    — headlines, supporting text, stat/step/trust items (with stagger)
     'left'  / 'right' — alternating feature cards + hero mock
   delay (seconds) drives the staggered cascade for grids. */
function Anim({
  children,
  dir = 'up',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  dir?: 'up' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`anim anim-${dir} ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/* ── Section wrapper (background only — entrance is per-element now) ──────────── */
function Section({
  children,
  className = '',
  alt = false,
  transparent = false,
  semiTransparent = false,
}: {
  children: React.ReactNode;
  className?: string;
  alt?: boolean;
  transparent?: boolean;
  semiTransparent?: boolean;
}) {
  const bgClass = transparent
    ? 'bg-transparent'
    : semiTransparent
      ? alt
        ? 'bg-[var(--color-bg-alt-semi)]'
        : 'bg-[var(--color-bg-semi)]'
      : alt
        ? 'bg-[var(--color-bg-alt)]'
        : 'bg-[var(--color-bg)]';
  return <section className={`${bgClass} ${className}`}>{children}</section>;
}

/* ── Accent text ──────────────────────────────────────────────────────────── */
function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--color-accent)]">{children}</span>;
}

/* ── Feature data ─────────────────────────────────────────────────────────── */
/* `category` is a plain description of what the feature does — never internal
   build-phase numbering. */
const agents = [
  {
    title: 'Technical SEO Audit',
    desc: 'Crawls your site with axios + cheerio — no headless browser. Checks meta tags, headings, alt text, robots.txt, sitemap, and broken internal links.',
    category: 'Technical',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Keyword Research',
    desc: 'Enter seed keywords and AI expands them into topic clusters with intent classification and difficulty scores.',
    category: 'Keywords',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
    ),
  },
  {
    title: 'Content SEO Review',
    desc: 'AI evaluates keyword usage, structure, and readability. Get specific improvement suggestions with an estimated readability score.',
    category: 'Content',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="7" y1="8" x2="17" y2="8" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Competitor Gap Analysis',
    desc: 'Crawl competitor pages and identify content topics they cover that you don\'t. Each gap quantified with an opportunity score.',
    category: 'Competitors',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <circle cx="9" cy="12" r="6" />
        <circle cx="15" cy="12" r="6" />
      </svg>
    ),
  },
  {
    title: 'Rank Tracking',
    desc: 'Connect Google Search Console via OAuth. Real position, click, and impression data from the official API — no SERP scraping.',
    category: 'Rankings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    title: 'Action Plan',
    desc: 'Gathers data from audits, keyword research, competitor analysis, and rank tracking — then generates a prioritized plan with 8–15 trackable items.',
    category: 'Strategy',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

/* ── Dashboard mock ───────────────────────────────────────────────────────── */
function DashboardMock() {
  return (
    <div className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-elevated rounded-2xl border p-5 sm:p-6">
      {/* Title bar */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
        </div>
        <div className="bg-[var(--color-bg-alt)] flex-1 rounded-md px-2.5 py-1">
          <span className="text-[var(--color-text-tertiary)] text-[10px] font-mono">seo-os.hf.space/app/sites/example.com/audit</span>
        </div>
      </div>
      {/* Stats row */}
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        {[
          { label: 'Pages Crawled', value: '18', color: 'var(--color-accent)' },
          { label: 'Issues Found', value: '24', color: '#ef4444' },
          { label: 'Action Items', value: '12', color: '#22c55e' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-bg)] rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold font-heading" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[var(--color-text-tertiary)] mt-0.5 text-[9px] tracking-wider uppercase">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Issue bars */}
      <div className="space-y-2.5">
        {[
          { label: 'Missing Meta Descriptions', count: 7, pct: 70, color: 'var(--color-accent)' },
          { label: 'Missing Alt Text', count: 5, pct: 50, color: 'var(--color-accent)' },
          { label: 'Broken Internal Links', count: 3, pct: 30, color: '#ef4444' },
          { label: 'Heading Issues', count: 2, pct: 20, color: '#f59e0b' },
        ].map((i) => (
          <div key={i.label}>
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)] text-[10px]">{i.label}</span>
              <span className="text-[var(--color-text-tertiary)] text-[10px] font-mono">{i.count}</span>
            </div>
            <div className="bg-[var(--color-bg)] h-1.5 overflow-hidden rounded-full">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${i.pct}%`, backgroundColor: i.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step data ────────────────────────────────────────────────────────────── */
const steps = [
  {
    num: '01',
    title: 'Add your site',
    desc: 'Create a workspace, add your domain, and optionally connect Google Search Console.',
  },
  {
    num: '02',
    title: 'Run AI agents',
    desc: 'Launch audits, keyword research, competitor analysis, and content reviews with one click.',
  },
  {
    num: '03',
    title: 'Get your action plan',
    desc: 'AI synthesizes all data into a prioritized plan. Track each item from to-do to done.',
  },
  {
    num: '04',
    title: 'Track real rankings',
    desc: 'GSC integration pulls real position, click, and impression data. No SERP scraping.',
  },
];

/* ── Trust signals ────────────────────────────────────────────────────────── */
const trustSignals = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Official Google Search Console API',
    desc: 'Rank tracking uses the official Google API — no scraping, no proxy, no black-hat methods.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: 'AI-powered via Groq',
    desc: 'All AI calls use llama-3.3-70b-versatile with structured JSON output — fast, deterministic, no hallucination.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: 'Production-grade security',
    desc: 'AES-256-CBC encrypted GSC tokens, bcrypt 12-round hashing, JWT auth, no plaintext secrets.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: 'Container-safe architecture',
    desc: 'Startup sweep + cron watchdog guarantee no stuck jobs after restarts. Built for constrained hosting.',
  },
];

/* ── Landing Page ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  // Auto-open only on a user's very first visit. The `seo-os-tour-seen` flag is
  // set on dismiss/completion (see WelcomeTour.handleClose), so returning
  // visitors don't get the tour again. The navbar "Tour" button replays it
  // manually regardless of the flag.
  const [tourOpen, setTourOpen] = useState(() => {
    try {
      return localStorage.getItem('seo-os-tour-seen') !== 'true';
    } catch {
      return true;
    }
  });

  const closeTour = useCallback(() => setTourOpen(false), []);
  const openTour = useCallback(() => setTourOpen(true), []);

  return (
    <>
      <LandingBackground />
      <WelcomeTour open={tourOpen} onClose={closeTour} />
      <div className="relative z-[1] min-h-screen transition-colors duration-300">

      {/* ══════════════════════════════════════════════════════════════════════
          NAVBAR — Signature logo location #1 (top-left, compact)
          ══════════════════════════════════════════════════════════════════════ */}
      <nav className="bg-[var(--color-bg)]/80 sticky top-0 z-50 border-b border-[var(--color-border)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-2.5 sm:px-6">
          <Logo variant="compact" className="" />
          <div className="flex items-center gap-1.5">
            <button
              onClick={openTour}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] px-2 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1"
              title="Take the tour"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                <circle cx="7" cy="7" r="5" />
                <line x1="10.5" y1="10.5" x2="14" y2="14" />
                <path d="M5 7h4M7 5v4" />
              </svg>
              <span className="hidden sm:inline">Tour</span>
            </button>
            <ThemeToggle />
            <Link
              to="/login"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — headline slides up, mock slides in from the right
          ══════════════════════════════════════════════════════════════════════ */}
      <Section transparent className="px-5 py-10 sm:py-14 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left — headline */}
            <div>
              <Anim dir="up">
                <span className="text-[var(--color-accent)] mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-3 py-1 text-xs font-semibold tracking-wider uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                  Multi-agent SEO platform
                </span>
              </Anim>
              <Anim dir="up" delay={0.06}>
                <h1 className="font-heading text-[var(--color-text-primary)] mb-4 text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                  Stop juggling<Accent>.</Accent><br />
                  Start <Accent>optimizing</Accent>.
                </h1>
              </Anim>
              <Anim dir="up" delay={0.12}>
                <p className="text-[var(--color-text-secondary)] mb-6 max-w-lg text-base leading-relaxed">
                  Six AI agents. One platform. Audit your site, research keywords, analyze
                  competitors, and get a prioritized action plan — all from a single dashboard.
                </p>
              </Anim>
              <Anim dir="up" delay={0.18}>
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                  <Link
                    to="/register"
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] rounded-xl px-7 py-3 text-sm font-semibold transition-all hover:shadow-lg text-center"
                  >
                    Start Free →
                  </Link>
                  <Link
                    to="/login"
                    className="border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] rounded-xl border px-7 py-3 text-sm font-medium transition-colors text-center"
                  >
                    Sign in
                  </Link>
                </div>
              </Anim>
            </div>
            {/* Right — dashboard mock */}
            <Anim dir="right" delay={0.1} className="flex justify-center">
              <div className="max-w-[620px] w-full">
                <DashboardMock />
              </div>
            </Anim>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES — cards alternate slide-in from left / right, row-staggered
          ══════════════════════════════════════════════════════════════════════ */}
      <Section alt semiTransparent className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <Anim dir="up">
              <p className="text-[var(--color-accent)] mb-2 text-xs font-semibold tracking-wider uppercase">
                Six AI agents
              </p>
            </Anim>
            <Anim dir="up" delay={0.06}>
              <h2 className="font-heading text-[var(--color-text-primary)] mb-2 text-2xl font-bold sm:text-3xl">
                Every SEO task.<Accent> One platform.</Accent>
              </h2>
            </Anim>
            <Anim dir="up" delay={0.12}>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                You audit in one tool, research keywords in another, check competitors in a third —
                and then manually piece it all together. That's not a workflow. That's duct tape.
              </p>
            </Anim>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, idx) => (
              <Anim
                key={agent.title}
                dir={idx % 2 === 0 ? 'left' : 'right'}
                delay={(idx % 3) * 0.08}
              >
                <div className="card-lift bg-[var(--color-surface)] border-[var(--color-border)] shadow-card h-full rounded-xl border p-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="text-[var(--color-accent)] flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
                      {agent.icon}
                    </div>
                    <span className="text-[var(--color-accent)] rounded-full border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/8 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                      {agent.category}
                    </span>
                  </div>
                  <h3 className="font-heading text-[var(--color-text-primary)] mb-1.5 text-base font-semibold">
                    {agent.title}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    {agent.desc}
                  </p>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS — heading slides up, step cards cascade-stagger up
          ══════════════════════════════════════════════════════════════════════ */}
      <Section semiTransparent className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <Anim dir="up">
            <p className="text-[var(--color-accent)] mb-2 text-center text-xs font-semibold tracking-wider uppercase">
              How it works
            </p>
          </Anim>
          <Anim dir="up" delay={0.06}>
            <h2 className="font-heading text-[var(--color-text-primary)] mb-8 text-center text-2xl font-bold sm:text-3xl">
              Four steps to <Accent>actionable SEO</Accent>.
            </h2>
          </Anim>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, idx) => (
              <Anim key={s.num} dir="up" delay={idx * 0.09} className="relative">
                <div className="card-lift bg-[var(--color-surface)] border-[var(--color-border)] shadow-card h-full rounded-xl border p-5">
                  <span className="text-[var(--color-accent)] font-heading mb-2 block text-2xl font-bold">
                    {s.num}
                  </span>
                  <h3 className="font-heading text-[var(--color-text-primary)] mb-1.5 text-sm font-semibold">
                    {s.title}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">
                    {s.desc}
                  </p>
                </div>
                {/* Connector line (not on last item) */}
                {idx < steps.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-[var(--color-border)] lg:block" />
                )}
              </Anim>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST / CREDIBILITY — heading slides up, items cascade-stagger up
          ══════════════════════════════════════════════════════════════════════ */}
      <Section alt semiTransparent className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <Anim dir="up">
            <p className="text-[var(--color-accent)] mb-2 text-center text-xs font-semibold tracking-wider uppercase">
              Built different
            </p>
          </Anim>
          <Anim dir="up" delay={0.06}>
            <h2 className="font-heading text-[var(--color-text-primary)] mb-8 text-center text-2xl font-bold sm:text-3xl">
              Honest engineering<Accent>,</Accent> not marketing fluff.
            </h2>
          </Anim>

          <div className="grid gap-3 sm:grid-cols-2">
            {trustSignals.map((t, idx) => (
              <Anim key={t.title} dir="up" delay={idx * 0.09}>
                <div className="card-lift bg-[var(--color-surface)] border-[var(--color-border)] shadow-card h-full rounded-xl border p-5">
                  <div className="mb-2 flex items-center gap-2.5">
                    <div className="text-[var(--color-accent)] flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]/10">
                      {t.icon}
                    </div>
                    <h3 className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">
                      {t.title}
                    </h3>
                  </div>
                  <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">{t.desc}</p>
                </div>
              </Anim>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA — slides up as one block
          ══════════════════════════════════════════════════════════════════════ */}
      <Section semiTransparent className="px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Anim dir="up">
            <h2 className="font-heading text-[var(--color-text-primary)] mb-3 text-2xl font-bold sm:text-3xl">
              Ready to <Accent>optimize</Accent>?
            </h2>
          </Anim>
          <Anim dir="up" delay={0.06}>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
              No credit card. No trial limits. Register and start auditing in under a minute.
            </p>
          </Anim>
          <Anim dir="up" delay={0.12}>
            <Link
              to="/register"
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] inline-block rounded-xl px-8 py-3 text-sm font-semibold transition-all hover:shadow-lg"
            >
              Get Started Free →
            </Link>
          </Anim>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER — Signature logo location #2 (full)
          ══════════════════════════════════════════════════════════════════════ */}
      <Footer />
      </div>
    </>
  );
}
