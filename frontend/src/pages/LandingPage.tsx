import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

const features = [
  {
    icon: '🔧',
    title: 'Technical SEO Audit',
    desc: 'Crawl your site and get a detailed report — missing meta tags, broken links, heading issues, robots.txt, sitemap, and alt text gaps.',
  },
  {
    icon: '🔍',
    title: 'Keyword Research',
    desc: 'Enter seed keywords and AI expands them into topic clusters with intent classification and difficulty scores.',
  },
  {
    icon: '✍️',
    title: 'Content SEO Review',
    desc: 'AI evaluates keyword usage, structure, and readability. Get specific improvement suggestions with a readability score.',
  },
  {
    icon: '🏆',
    title: 'Competitor Gap Analysis',
    desc: 'Crawl competitor pages and identify content topics they cover that you don\'t — each gap quantified with an opportunity score.',
  },
  {
    icon: '📈',
    title: 'Rank Tracking',
    desc: 'Connect Google Search Console via OAuth. Real position, click, and impression data from the official API — no SERP scraping.',
  },
  {
    icon: '📋',
    title: 'Action Plan',
    desc: 'The synthesis layer. Gathers data from all agents and generates a prioritized action plan with trackable items.',
  },
];

const techStack = [
  { name: 'Node.js', color: 'text-green-400' },
  { name: 'Express', color: 'text-white' },
  { name: 'MongoDB', color: 'text-green-500' },
  { name: 'React', color: 'text-cyan-400' },
  { name: 'TypeScript', color: 'text-blue-400' },
  { name: 'Tailwind CSS', color: 'text-cyan-500' },
  { name: 'Vite', color: 'text-purple-400' },
  { name: 'Groq AI', color: 'text-orange-400' },
];

export default function LandingPage() {
  return (
    <div className="bg-navy flex min-h-screen flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,94,60,0.1)_0%,transparent_60%)]" />

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 sm:px-10">
          <Logo variant="compact" theme="dark" />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sage/70 hover:text-cream transition-colors text-sm font-medium"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-clay hover:bg-clay/80 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Headline */}
        <div className="fade-in relative z-10 max-w-3xl">
          <Logo variant="full" theme="dark" className="mb-6 justify-center" />
          <h1 className="font-heading text-cream mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            AI-Powered Multi-Agent<br />
            <span className="text-clay">SEO Platform</span>
          </h1>
          <p className="text-sage/70 mx-auto mb-8 max-w-xl text-lg leading-relaxed">
            Audit, analyze, and act — all in one place. Six AI agents work together
            to find SEO issues, research keywords, analyze competitors, and generate
            prioritized action plans.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className="bg-clay hover:bg-clay/80 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-colors"
            >
              Start Free →
            </Link>
            <Link
              to="/login"
              className="border border-sage/20 hover:border-sage/40 text-sage/70 hover:text-cream rounded-xl px-8 py-3.5 text-base font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-cream mb-2 text-center text-2xl font-bold sm:text-3xl">
            Six AI Agents. One Platform.
          </h2>
          <p className="text-sage/60 mb-12 text-center">
            Each agent specializes in a different aspect of SEO — and they all feed into a unified action plan.
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <span className="mb-3 block text-2xl">{f.icon}</span>
                <h3 className="font-heading text-cream mb-1.5 text-base font-semibold">{f.title}</h3>
                <p className="text-sage/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading text-cream mb-12 text-center text-2xl font-bold sm:text-3xl">
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'Add Your Site', desc: 'Create a workspace and add your domain. Connect Google Search Console for rank tracking.' },
              { step: '2', title: 'Run AI Agents', desc: 'Launch audits, keyword research, competitor analysis, and content reviews with one click.' },
              { step: '3', title: 'Get Action Plan', desc: 'AI synthesizes all data into a prioritized plan. Track each item from to-do to done.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="bg-clay/20 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-clay">
                  {s.step}
                </div>
                <h3 className="font-heading text-cream mb-1.5 text-base font-semibold">{s.title}</h3>
                <p className="text-sage/60 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-cream mb-8 text-2xl font-bold sm:text-3xl">
            Built With Modern Stack
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {techStack.map((t) => (
              <span
                key={t.name}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium"
              >
                <span className={t.color}>{t.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-cream mb-4 text-2xl font-bold sm:text-3xl">
            Ready to Optimize Your SEO?
          </h2>
          <p className="text-sage/60 mb-8">
            No credit card required. Register and start auditing in under a minute.
          </p>
          <Link
            to="/register"
            className="bg-clay hover:bg-clay/80 inline-block rounded-xl px-10 py-4 text-base font-semibold text-white transition-colors"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
