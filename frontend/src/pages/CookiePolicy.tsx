/**
 * Cookie Policy page — brief, accurate, no filler.
 */

import LegalLayout from '../components/LegalLayout';

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="July 2025">
      <p>We keep this short because we don&apos;t have much to say — we use very few cookies and local storage.</p>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">What we use</h2>

      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="font-heading text-cream/80 px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                Type
              </th>
              <th className="font-heading text-cream/80 px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                Purpose
              </th>
              <th className="font-heading text-cream/80 px-5 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                Persistence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            <tr>
              <td className="text-cream/80 px-5 py-3">Auth token (JWT)</td>
              <td className="text-sage/70 px-5 py-3">
                Identifies your session to the API. Stored in browser memory (Zustand store), not a cookie.
              </td>
              <td className="text-sage/70 px-5 py-3">Session only — cleared on tab close or page refresh</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">What we don&apos;t use</h2>
      <ul className="list-inside list-disc space-y-2">
        <li>
          <strong>No third-party advertising cookies</strong> — no Google Ads, no Facebook Pixel, no retargeting
        </li>
        <li>
          <strong>No analytics cookies</strong> — no Google Analytics, no Mixpanel, no Hotjar
        </li>
        <li>
          <strong>No social media tracking</strong> — no share buttons that inject cookies
        </li>
      </ul>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">If we add analytics later</h2>
      <p>
        If we add analytics or tracking in the future, we will update this page and seek your consent before enabling
        any non-essential cookies, in compliance with applicable regulations.
      </p>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">Google Fonts</h2>
      <p>
        We load Google Fonts (Space Grotesk, Inter, Dancing Script) via CSS imports. Google may receive a request for
        the font files and could potentially log your IP address. If you prefer not to make this request, you can block
        fonts.googleapis.com in your browser settings.
      </p>

      <h2 className="font-heading text-cream mt-8 mb-3 text-lg font-semibold">Contact</h2>
      <p>
        Questions?{' '}
        <a href="mailto:support@seo-os.com" className="text-clay hover:text-clay/80 underline underline-offset-2">
          support@seo-os.com
        </a>
      </p>
    </LegalLayout>
  );
}
