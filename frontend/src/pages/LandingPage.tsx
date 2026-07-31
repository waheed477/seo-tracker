import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import ThemeToggle from '../components/ThemeToggle';

/* ── Scroll-reveal hook ──────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Section wrapper with reveal ──────────────────────────────────────────── */
function Section({ children, className = '', alt = false }: { children: React.ReactNode; className?: string; alt?: boolean }) {
  const ref = useReveal();
  return (
    <section
      ref={ref}
      className={`reveal ${alt ? 'bg-[var(--color-bg-alt)]' : 'bg-[var(--color-bg)]'} ${className}`}
    >
      {children}
    </section>
  );
}

/* ── Accent text ──────────────────────────────────────────────────────────── */
function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--color-accent)]">{children}</span>;
}

/* ── Feature data ─────────────────────────────────────────────────────────── */
const agents = [
  {
    title: 'Technical SEO Audit',
    desc: 'Crawls your site with axios + cheerio — no headless browser. Checks meta tags, headings, alt text, robots.txt, sitemap, and broken internal links. Results in seconds.',
    badge: 'Phase 2',
    visual: 'audit' as const,
  },
  {
    title: 'Keyword Research',
    desc: 'Enter seed keywords and the AI expands them into topic clusters with intent classification (informational, transactional, navigational, commercial) and difficulty scores.',
    badge: 'Phase 3',
    visual: 'keywords' as const,
  },
  {
    title: 'Content SEO Review',
    desc: 'AI evaluates keyword usage, structure, and readability. Get specific improvement suggestions with an estimated readability score — no generic advice.',
    badge: 'Phase 4',
    visual: 'content' as const,
  },
  {
    title: 'Competitor Gap Analysis',
    desc: 'Crawl competitor pages and identify content topics they cover that you don\'t. Each gap is quantified with an opportunity score so you know what to write next.',
    badge: 'Phase 5',
    visual: 'competitor' as const,
  },
  {
    title: 'Rank Tracking',
    desc: 'Connect Google Search Console via OAuth. Real position, click, and impression data from the official API — no SERP scraping. A daily cron syncs data automatically.',
    badge: 'Phase 6',
    visual: 'rankings' as const,
  },
  {
    title: 'Action Plan',
    desc: 'The synthesis layer. Gathers data from audits, keyword research, competitor analysis, and rank tracking — then generates a prioritized action plan with 8–15 trackable items.',
    badge: 'Phase 7',
    visual: 'action-plan' as const,
  },
];

/* ── Dashboard mock ───────────────────────────────────────────────────────── */
function DashboardMock() {
  return (
    <div className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-elevated rounded-2xl border p-6 sm:p-8">
      {/* Title bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400/60" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
          <span className="h-3 w-3 rounded-full bg-green-400/60" />
        </div>
        <div className="bg-[var(--color-bg-alt)] flex-1 rounded-md px-3 py-1.5">
          <span className="text-[var(--color-text-tertiary)] text-xs font-mono">seo-os.hf.space/app/sites/example.com/audit</span>
        </div>
      </div>
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Pages Crawled', value: '18', color: 'var(--color-accent)' },
          { label: 'Issues Found', value: '24', color: '#ef4444' },
          { label: 'Action Items', value: '12', color: '#22c55e' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--color-bg)] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold font-heading" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[var(--color-text-tertiary)] mt-0.5 text-[10px] tracking-wider uppercase">{s.label}</p>
          </div>
        ))}
      </div>
      {/* Issue bars */}
      <div className="space-y-3">
        {[
          { label: 'Missing Meta Descriptions', count: 7, pct: 70, color: 'var(--color-accent)' },
          { label: 'Missing Alt Text', count: 5, pct: 50, color: 'var(--color-accent)' },
          { label: 'Broken Internal Links', count: 3, pct: 30, color: '#ef4444' },
          { label: 'Heading Issues', count: 2, pct: 20, color: '#f59e0b' },
        ].map((i) => (
          <div key={i.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)] text-xs">{i.label}</span>
              <span className="text-[var(--color-text-tertiary)] text-xs font-mono">{i.count}</span>
            </div>
            <div className="bg-[var(--color-bg)] h-2 overflow-hidden rounded-full">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${i.pct}%`, backgroundColor: i.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Small agent visual icon ──────────────────────────────────────────────── */
function AgentVisual({ type }: { type: string }) {
  const accent = 'var(--color-accent)';
  const secondary = 'var(--color-text-tertiary)';
  const icons: Record<string, React.ReactNode> = {
    audit: (
      <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
        <rect x="4" y="4" width="40" height="40" rx="8" stroke={accent} strokeWidth="2" />
        <path d="M14 32l5-10 5 6 5-14 5 18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="32" r="2" fill={accent} />
        <circle cx="19" cy="22" r="2" fill={accent} />
        <circle cx="24" cy="28" r="2" fill={accent} />
        <circle cx="29" cy="14" r="2" fill={accent} />
        <circle cx="34" cy="32" r="2" fill={accent} />
      </svg>
    ),
    keywords: (
      <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
        <circle cx="20" cy="20" r="12" stroke={accent} strokeWidth="2" />
        <line x1="28.5" y1="28.5" x2="42" y2="42" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="18" r="2" fill={secondary} />
        <circle cx="24" cy="16" r="2" fill={secondary} />
        <circle cx="20" cy="24" r="2" fill={secondary} />
      </svg>
    ),
    content: (
      <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
        <rect x="6" y="4" width="36" height="40" rx="4" stroke={accent} strokeWidth="2" />
        <line x1="14" y1="14" x2="34" y2="14" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="21" x2="34" y2="21" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="28" x2="26" y2="28" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        <path d="M30 34l3 3 5-7" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    competitor: (
      <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
        <circle cx="16" cy="24" r="10" stroke={accent} strokeWidth="2" />
        <circle cx="32" cy="24" r="10" stroke={accent} strokeWidth="2" />
        <path d="M22 18c2 2 2 10 0 12M26 18c-2 2-2 10 0 12" stroke={secondary} strokeWidth="1.5" />
      </svg>
    ),
    rankings: (
      <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
        <rect x="6" y="28" width="8" height="14" rx="2" fill={secondary} />
        <rect x="20" y="18" width="8" height="24" rx="2" fill={accent} />
        <rect x="34" y="8" width="8" height="34" rx="2" fill={accent} />
        <line x1="4" y1="44" x2="44" y2="44" stroke={accent} strokeWidth="2" />
      </svg>
    ),
    'action-plan': (
      <svg viewBox="0 0 48 48" fill="none" className="h-12 w-12">
        <rect x="6" y="4" width="36" height="40" rx="4" stroke={accent} strokeWidth="2" />
        <path d="M14 16l3 3 5-6" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="26" y1="16" x2="36" y2="16" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        <path d="M14 26l3 3 5-6" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="26" y1="26" x2="36" y2="26" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
        <path d="M14 36l3 3 5-6" stroke={secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="26" y1="36" x2="36" y2="36" stroke={secondary} strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  };
  return <>{icons[type] ?? null}</>;
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
    desc: 'All AI calls use llama-3.3-70b-versatile with structured JSON output — fast, deterministic, no hallucination in pipeline.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: 'Production-grade security',
    desc: 'AES-256-CBC encrypted GSC tokens, bcrypt 12-round password hashing, JWT auth, no plaintext secrets.',
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
  return (
    <div className="bg-[var(--color-bg)] min-h-screen transition-colors duration-300">

      {/* ══════════════════════════════════════════════════════════════════════
          NAVBAR
          ══════════════════════════════════════════════════════════════════════ */}
      <nav className="bg-[var(--color-bg)]/80 sticky top-0 z-50 border-b border-[var(--color-border)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 sm:px-8">
          <Logo variant="compact" theme="dark" className="dark:block hidden" />
          <Logo variant="compact" theme="light" className="dark:hidden block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] px-3 py-2 text-sm font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════════ */}
      <Section className="px-6 py-20 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left — headline */}
            <div>
              <div className="mb-6">
                <Logo variant="full" theme="dark" className="dark:block hidden" />
                <Logo variant="full" theme="light" className="dark:hidden block" />
              </div>
              <h1 className="font-heading text-[var(--color-text-primary)] mb-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Stop juggling<Accent>.</Accent><br />
                Start <Accent>optimizing</Accent>.
              </h1>
              <p className="text-[var(--color-text-secondary)] mb-8 max-w-lg text-lg leading-relaxed">
                Six AI agents. One platform. Audit your site, research keywords, analyze
                competitors, and get a prioritized action plan — all from a single dashboard.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/register"
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] rounded-xl px-8 py-3.5 text-base font-semibold transition-all hover:shadow-lg"
                >
                  Start Free →
                </Link>
                <Link
                  to="/login"
                  className="border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] rounded-xl border px-8 py-3.5 text-base font-medium transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
            {/* Right — dashboard mock */}
            <div className="fade-in">
              <DashboardMock />
            </div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          PROBLEM / AGITATION
          ══════════════════════════════════════════════════════════════════════ */}
      <Section alt className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[var(--color-accent)] mb-4 text-sm font-semibold tracking-wider uppercase">
            The problem
          </p>
          <h2 className="font-heading text-[var(--color-text-primary)] mb-6 text-3xl font-bold leading-tight sm:text-4xl">
            SEO tools are <Accent>fragmented</Accent>.
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
            You audit in one tool, research keywords in another, check competitors in a third,
            track rankings somewhere else — and then manually piece it all together into a plan
            nobody follows. That's not a workflow. That's duct tape.
          </p>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURE SHOWCASE — alternating layout
          ══════════════════════════════════════════════════════════════════════ */}
      <Section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="text-[var(--color-accent)] mb-4 text-center text-sm font-semibold tracking-wider uppercase">
            Six AI agents
          </p>
          <h2 className="font-heading text-[var(--color-text-primary)] mb-16 text-center text-3xl font-bold sm:text-4xl">
            Every SEO task.<Accent> One platform.</Accent>
          </h2>

          <div className="space-y-20">
            {agents.map((agent, i) => {
              const isEven = i % 2 === 0;
              return (
                <div
                  key={agent.title}
                  className={`reveal grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${isEven ? '' : 'lg:direction-rtl'}`}
                  ref={undefined}
                >
                  {/* Visual */}
                  <div className={`${isEven ? 'lg:order-1' : 'lg:order-2'} flex justify-center`}>
                    <div className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-card flex items-center justify-center rounded-2xl border p-8 sm:p-10">
                      <AgentVisual type={agent.visual} />
                    </div>
                  </div>
                  {/* Text */}
                  <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
                    <span className="text-[var(--color-accent)] mb-3 inline-block rounded-full border border-[var(--color-border)] bg-[var(--color-bg-alt)] px-3 py-1 text-xs font-medium tracking-wider">
                      {agent.badge}
                    </span>
                    <h3 className="font-heading text-[var(--color-text-primary)] mb-3 text-2xl font-bold sm:text-3xl">
                      {agent.title}
                    </h3>
                    <p className="text-[var(--color-text-secondary)] text-base leading-relaxed">
                      {agent.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════════════════════════ */}
      <Section alt className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-[var(--color-accent)] mb-4 text-center text-sm font-semibold tracking-wider uppercase">
            How it works
          </p>
          <h2 className="font-heading text-[var(--color-text-primary)] mb-16 text-center text-3xl font-bold sm:text-4xl">
            Four steps to <Accent>actionable SEO</Accent>.
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="text-center lg:text-left">
                <span className="text-[var(--color-accent)] font-heading mb-3 block text-3xl font-bold">
                  {s.num}
                </span>
                <h3 className="font-heading text-[var(--color-text-primary)] mb-2 text-lg font-semibold">
                  {s.title}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST / CREDIBILITY
          ══════════════════════════════════════════════════════════════════════ */}
      <Section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-[var(--color-accent)] mb-4 text-center text-sm font-semibold tracking-wider uppercase">
            Built different
          </p>
          <h2 className="font-heading text-[var(--color-text-primary)] mb-16 text-center text-3xl font-bold sm:text-4xl">
            Honest engineering<Accent>,</Accent> not marketing fluff.
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {trustSignals.map((t) => (
              <div
                key={t.title}
                className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-card rounded-2xl border p-6 transition-all hover:shadow-card-hover"
              >
                <div className="text-[var(--color-accent)] mb-3">{t.icon}</div>
                <h3 className="font-heading text-[var(--color-text-primary)] mb-1.5 text-base font-semibold">
                  {t.title}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
          ══════════════════════════════════════════════════════════════════════ */}
      <Section alt className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-[var(--color-text-primary)] mb-4 text-3xl font-bold sm:text-4xl">
            Ready to <Accent>optimize</Accent>?
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8 text-lg">
            No credit card. No trial limits. Register and start auditing in under a minute.
          </p>
          <Link
            to="/register"
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] inline-block rounded-xl px-10 py-4 text-base font-semibold transition-all hover:shadow-lg"
          >
            Get Started Free →
          </Link>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
}
