/**
 * Security page — honest description of our actual security practices.
 * No fabricated compliance claims. No badges we haven't earned.
 */

import LegalLayout from '../components/LegalLayout';

export default function SecurityPage() {
  return (
    <LegalLayout title="How We Handle Security" lastUpdated="July 2025">
      <p>
        We take security seriously, but we believe in being honest about what we do rather than claiming certifications
        we don&apos;t have. This page describes our actual practices — not aspirational ones.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">Authentication</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>Passwords are hashed with bcrypt (12 rounds)</strong> — we never store passwords in plain text. Even
          if the database were compromised, passwords would not be readable.
        </li>
        <li>
          <strong>JWT-based authentication</strong> — we use stateless JSON Web Tokens for session management. The
          short-lived access token (15 minutes) is delivered in an <code>httpOnly</code> cookie, so JavaScript running
          in the page cannot read it.
        </li>
        <li>
          <strong>Rotating refresh tokens</strong> — a longer-lived (30 day) refresh token, also in an{' '}
          <code>httpOnly</code> cookie, keeps you signed in across page refreshes and browser restarts. It is stored
          only as a bcrypt hash in our database, is rotated on every use, and is revoked server-side when you sign out.
        </li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">Encryption at rest</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>GSC refresh tokens are encrypted with AES-256-CBC</strong> — when you connect Google Search Console,
          the OAuth refresh token is encrypted before storage in MongoDB using a server-side encryption key
          (SITE_ENCRYPTION_KEY). We never store refresh tokens in plaintext.
        </li>
        <li>
          <strong>MongoDB Atlas encryption</strong> — our database provider encrypts data in transit (TLS) and at rest
          by default.
        </li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">Crawler security and ethics</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>No Puppeteer or headless browser</strong> — our crawler uses axios + cheerio only. It fetches HTML and
          parses it server-side. It does not execute JavaScript, render pages, or interact with dynamic content.
        </li>
        <li>
          <strong>Respects robots.txt</strong> — if a site&apos;s robots.txt disallows crawling, we honour that
          directive.
        </li>
        <li>
          <strong>Rate-limited and polite</strong> — 400 ms delay between every HTTP request. Maximum 20 pages per
          crawl. Maximum 5 gap analyses per site per 24 hours.
        </li>
        <li>
          <strong>Transparent User-Agent</strong> — our crawler identifies itself as{' '}
          <code className="text-[var(--color-text-tertiary)] rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs">
            SEO-OS-Audit/1.0 (Technical SEO auditing tool)
          </code>
          .
        </li>
        <li>
          <strong>No SERP scraping</strong> — we never scrape Google search results. Rank tracking is exclusively via
          the official Google Search Console API with user authorisation.
        </li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">Environment secrets</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>Secrets never reach the client</strong> — JWT_SECRET, GROQ_API_KEY, SITE_ENCRYPTION_KEY, and Google
          OAuth credentials are server-side only. They are never bundled into the frontend, never exposed in API
          responses, and never sent to the browser.
        </li>
        <li>
          <strong>CORS is explicit</strong> — we do not use wildcard{' '}
          <code className="text-[var(--color-text-tertiary)] rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs">
            Access-Control-Allow-Origin: *
          </code>
          . Only the FRONTEND_URL you configure is allowed as an origin.
        </li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">Infrastructure</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>Single-process architecture</strong> — no Redis, no message queues, no external job runners. This
          reduces the attack surface by eliminating additional services that could be compromised.
        </li>
        <li>
          <strong>Container restart safety</strong> — on boot, any jobs stuck in a &quot;running&quot; state are
          immediately marked as &quot;failed&quot; (startup sweep). A cron watchdog also marks stuck jobs older than 5
          minutes as failed. This prevents zombie processes.
        </li>
        <li>
          <strong>Dependencies are minimal</strong> — we deliberately use a small dependency tree to reduce the surface
          area for supply-chain attacks.
        </li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">What we don't claim</h2>
      <p>
        We want to be transparent about what we <em>don&apos;t</em> have:
      </p>
      <ul className="list-inside list-disc space-y-2">
        <li>
          We are <strong>not SOC 2 certified</strong>
        </li>
        <li>
          We are <strong>not ISO 27001 certified</strong>
        </li>
        <li>
          We have <strong>not undergone a formal penetration test</strong>
        </li>
        <li>
          We do <strong>not have a formal GDPR Data Protection Officer</strong>
        </li>
        <li>
          We do <strong>not have a bug bounty program</strong> (yet)
        </li>
      </ul>
      <p className="mt-3">
        If any of these are requirements for your organisation, we recommend evaluating whether this platform meets your
        compliance needs. We&apos;re happy to discuss specific security questions at{' '}
        <a href="mailto:support@seo-os.com" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline underline-offset-2">
          support@seo-os.com
        </a>
        .
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">Reporting security issues</h2>
      <p>
        If you discover a security vulnerability, please report it responsibly to{' '}
        <a href="mailto:support@seo-os.com" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline underline-offset-2">
          support@seo-os.com
        </a>
        . We ask that you give us reasonable time to respond before public disclosure.
      </p>
    </LegalLayout>
  );
}
