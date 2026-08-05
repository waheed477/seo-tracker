/**
 * Terms of Service page — accurate to what this app actually does.
 * Honest about AI-generated content limitations. No fabricated legal claims.
 */

import LegalLayout from '../components/LegalLayout';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="July 2025">
      <p>
        By using SEO Operating System (&quot;SEO OS&quot;), you agree to these terms. If you don&apos;t agree, please
        don&apos;t use the platform. We wrote these in plain language because we respect your time.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">1. Acceptable use</h2>
      <p>SEO OS is a tool for analysing and improving the SEO of websites. You may use it to:</p>
      <ul className="list-inside list-disc space-y-2">
        <li>Audit websites you own or have explicit permission to analyse</li>
        <li>Research keywords for your own content strategy</li>
        <li>Analyse competitor websites using publicly accessible data (the same HTTP requests any browser makes)</li>
        <li>Track rankings via Google Search Console for verified properties</li>
      </ul>
      <p className="mt-3">
        You may <strong>not</strong> use the platform to:
      </p>
      <ul className="list-inside list-disc space-y-2">
        <li>Scan or crawl websites you don&apos;t own or have permission to audit at scale</li>
        <li>
          Attempt to scrape search engine results pages (SERPs) — we don&apos;t do this, and you shouldn&apos;t use the
          platform to facilitate it
        </li>
        <li>
          Reverse-engineer, decompile, or attempt to extract the platform&apos;s source code or proprietary algorithms
        </li>
        <li>Use the platform in a way that violates any applicable law</li>
        <li>Resell access to the platform without written permission</li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">2. Account responsibilities</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
        <li>You must provide accurate registration information.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>
          If you suspect unauthorised access, contact us immediately at{' '}
          <a href="mailto:support@seo-os.com" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline underline-offset-2">
            support@seo-os.com
          </a>
          .
        </li>
      </ul>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">3. AI-generated content disclaimer</h2>
      <p>SEO OS uses AI (via the Groq API) to generate insights, suggestions, and analysis. This includes:</p>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>Keyword difficulty estimates</strong> — these are AI-estimated scores (0–100), not empirical
          measurements. They are clearly labelled as estimates in the UI.
        </li>
        <li>
          <strong>Content review suggestions</strong> — AI-generated recommendations for improving SEO quality. They are
          advisory, not definitive.
        </li>
        <li>
          <strong>Competitor gap analysis</strong> — AI-identified content opportunities based on publicly available
          data. These are suggestions, not guarantees.
        </li>
        <li>
          <strong>Action plans</strong> — prioritised, AI-synthesised recommendations. They are advisory and should be
          reviewed by a human before implementation.
        </li>
      </ul>
      <p className="mt-3">
        <strong>AI-generated content is advisory, not guaranteed.</strong> We do not warrant that following AI
        suggestions will improve search rankings. Search engine algorithms are opaque and constantly changing. Use AI
        recommendations as one input among many in your SEO strategy.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">4. Crawler behaviour</h2>
      <p>
        Our technical audit crawler respects <strong>robots.txt</strong> and uses a <strong>400 ms polite delay</strong>{' '}
        between requests. We identify ourselves with a transparent User-Agent header:{' '}
        <code className="text-[var(--color-text-tertiary)] rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs">
          SEO-OS-Audit/1.0 (Technical SEO auditing tool)
        </code>
        . We limit crawls to 20 pages per audit run and cap at 5 gap analyses per site per 24 hours. We use axios +
        cheerio — no headless browser, no JavaScript execution on crawled pages.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">5. Your data</h2>
      <p>
        You retain ownership of all data you provide to the platform (site URLs, content, keywords). We store it solely
        to provide the service. We do not claim any intellectual property rights over your data.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">6. Service availability</h2>
      <p>
        We strive to keep the platform available but do not guarantee uptime. The service is provided &quot;as is&quot;
        without warranties of any kind, express or implied. We may modify, suspend, or discontinue features with
        reasonable notice.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, SEO OS shall not be liable for any indirect, incidental, special,
        consequential, or punitive damages arising from your use of the platform. This includes, but is not limited to,
        damages for loss of profits, data, or business opportunities. Our total liability shall not exceed the amount
        you paid for the service in the 12 months preceding the claim.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">8. Termination</h2>
      <p>
        You may delete your account at any time by contacting{' '}
        <a href="mailto:support@seo-os.com" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline underline-offset-2">
          support@seo-os.com
        </a>
        . We reserve the right to suspend or terminate accounts that violate these terms, with notice where practicable.
        Upon termination, your data will be deleted within 30 days.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">9. Changes to these terms</h2>
      <p>
        We may update these terms as the product evolves. We&apos;ll note the &quot;Last updated&quot; date at the top.
        Material changes will be communicated via email or in-app notification. Continued use after changes constitutes
        acceptance.
      </p>

      <h2 className="font-heading text-[var(--color-text-primary)] mt-8 mb-3 text-lg font-semibold">10. Contact</h2>
      <p>
        Questions about these terms? Reach us at{' '}
        <a href="mailto:support@seo-os.com" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline underline-offset-2">
          support@seo-os.com
        </a>
        .
      </p>
    </LegalLayout>
  );
}
