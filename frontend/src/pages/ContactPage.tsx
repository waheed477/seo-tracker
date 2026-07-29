/**
 * Contact page — simple contact info, no backend form.
 */

import LegalLayout from '../components/LegalLayout';

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        We&apos;re a small team building SEO tools. The best way to reach us is email — we respond within 1–2 business
        days.
      </p>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">Support</h2>
      <p>For account issues, feature requests, or general questions:</p>
      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <a
          href="mailto:support@seo-os.com"
          className="text-clay hover:text-clay/80 group flex items-center gap-3 transition-colors"
        >
          <span className="bg-clay/15 border-clay/20 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay h-4 w-4">
              <rect x="1" y="3" width="14" height="10" rx="1.5" />
              <path d="M1 3l7 5 7-5" />
            </svg>
          </span>
          <div>
            <p className="font-heading text-sm font-semibold group-hover:underline">support@seo-os.com</p>
            <p className="text-sage/50 mt-0.5 text-xs">Account issues, feature requests, general questions</p>
          </div>
        </a>
      </div>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">Security</h2>
      <p>If you&apos;ve found a security vulnerability, please report it responsibly to:</p>
      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <a
          href="mailto:support@seo-os.com"
          className="text-clay hover:text-clay/80 group flex items-center gap-3 transition-colors"
        >
          <span className="bg-clay/15 border-clay/20 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay h-4 w-4">
              <path d="M8 1v2M8 13v2M3.76 3.76l1.41 1.41M10.83 10.83l1.41 1.41M1 8h2M13 8h2M3.76 12.24l1.41-1.41M10.83 5.17l1.41-1.41" />
              <circle cx="8" cy="8" r="3" />
            </svg>
          </span>
          <div>
            <p className="font-heading text-sm font-semibold group-hover:underline">support@seo-os.com</p>
            <p className="text-sage/50 mt-0.5 text-xs">
              Security vulnerability reports (please allow reasonable response time)
            </p>
          </div>
        </a>
      </div>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">Data deletion requests</h2>
      <p>
        To request deletion of your account and all associated data, email us at{' '}
        <a href="mailto:support@seo-os.com" className="text-clay hover:text-clay/80 underline underline-offset-2">
          support@seo-os.com
        </a>{' '}
        from the email address associated with your account. We&apos;ll process verified requests within 30 days.
      </p>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">Open source</h2>
      <p>
        SEO Operating System is an open-source portfolio project. You can find the source code and report issues on{' '}
        <a
          href="https://github.com/waheed000/seo-operator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-clay hover:text-clay/80 underline underline-offset-2"
        >
          GitHub
        </a>
        .
      </p>
    </LegalLayout>
  );
}
