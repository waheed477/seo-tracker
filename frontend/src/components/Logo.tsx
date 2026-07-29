/**
 * Logo.tsx — Brand logo for "SEO Operating System"
 *
 * Two variants:
 *   <Logo variant="full"    /> — signature + tagline, for login/register pages
 *   <Logo variant="compact" /> — signature mark only, for navbar/sidebar
 *
 * Accepts a `theme` prop ('light' | 'dark') that swaps stroke colors:
 *   - light: navy (#0A2947) signature on light backgrounds
 *   - dark:  cream (#F3E4C9) signature on dark backgrounds
 *
 * The clay accent (#8B5E3C) is used for the underline flourish.
 *
 * Script font: Dancing Script (loaded via @fontsource/dancing-script)
 */

import '@fontsource/dancing-script/700.css';

/* ── Theme colours ────────────────────────────────────────────────────────── */
const COLORS = {
  navy: '#0A2947',
  cream: '#F3E4C9',
  clay: '#8B5E3C',
  sage: '#D3D4C0',
} as const;

/* ── Props ────────────────────────────────────────────────────────────────── */
interface LogoProps {
  variant?: 'full' | 'compact';
  theme?: 'light' | 'dark';
  className?: string;
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function Logo({ variant = 'full', theme = 'dark', className = '' }: LogoProps) {
  const mainColor = theme === 'dark' ? COLORS.cream : COLORS.navy;
  const subColor = theme === 'dark' ? `${COLORS.sage}b3` : `${COLORS.navy}99`;
  const clayColor = COLORS.clay;

  /* ── Signature wordmark ────────────────────────────────────────────────── */
  const signature = (
    <span className="relative inline-block" style={{ fontFamily: '"Dancing Script", cursive', lineHeight: 1 }}>
      {/* The "S" — slightly larger and more prominent */}
      <span style={{ fontSize: variant === 'compact' ? '1.75em' : '2.2em', color: mainColor }}>S</span>
      {/* "EO" */}
      <span style={{ fontSize: variant === 'compact' ? '1.1em' : '1.4em', color: mainColor, marginLeft: '-0.02em' }}>
        EO
      </span>
      {/* Spacer dot accent in clay */}
      <span
        style={{
          display: 'inline-block',
          width: variant === 'compact' ? '0.2em' : '0.3em',
          height: variant === 'compact' ? '0.2em' : '0.3em',
          borderRadius: '50%',
          backgroundColor: clayColor,
          margin: `0 ${variant === 'compact' ? '0.2em' : '0.3em'}`,
          verticalAlign: variant === 'compact' ? '0.55em' : '0.7em',
        }}
      />
      {/* "OS" */}
      <span style={{ fontSize: variant === 'compact' ? '1.1em' : '1.4em', color: mainColor }}>OS</span>

      {/* Underline flourish — a short curved stroke in clay */}
      <span
        className="absolute block"
        style={{
          bottom: variant === 'compact' ? '-0.12em' : '-0.15em',
          left: '0',
          width: variant === 'compact' ? '55%' : '60%',
          height: variant === 'compact' ? '2.5px' : '3px',
          background: `linear-gradient(90deg, ${clayColor}, transparent)`,
          borderRadius: '2px',
        }}
      />
    </span>
  );

  /* ── Tagline ───────────────────────────────────────────────────────────── */
  const tagline = (
    <span
      className="block tracking-[0.25em] uppercase"
      style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui',
        fontSize: variant === 'compact' ? '0.5em' : '0.55em',
        color: subColor,
        fontWeight: 500,
        marginTop: variant === 'compact' ? '0.15em' : '0.2em',
        letterSpacing: '0.25em',
      }}
    >
      AI SEO Platform
    </span>
  );

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div
      className={`inline-flex flex-col items-start select-none ${className}`}
      style={{ fontFamily: '"Dancing Script", cursive' }}
    >
      {signature}
      {variant === 'full' && tagline}
    </div>
  );
}
