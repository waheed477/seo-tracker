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

/*
  Refactor: use CSS custom properties for colors so the logo automatically
  adapts to light/dark mode via the theme tokens. Keep `variant` and
  `className` for sizing + layout, but prefer the semantic tokens instead
  of inline hex values.
*/

interface LogoProps {
  variant?: 'full' | 'compact';
  theme?: 'light' | 'dark'; // kept for backwards compatibility, ignored
  className?: string;
}

export default function Logo({ variant = 'full', className = '' }: LogoProps) {
  /* Use semantic CSS tokens so the logo adapts to the `.dark` class. */
  const signature = (
    <span className="relative inline-block" style={{ fontFamily: '"Dancing Script", cursive', lineHeight: 1 }}>
      <span style={{ fontSize: variant === 'compact' ? '1.75em' : '2.2em', color: 'var(--color-text-primary)' }}>S</span>
      <span style={{ fontSize: variant === 'compact' ? '1.1em' : '1.4em', color: 'var(--color-text-primary)', marginLeft: '-0.02em' }}>
        EO
      </span>
      <span
        style={{
          display: 'inline-block',
          width: variant === 'compact' ? '0.2em' : '0.3em',
          height: variant === 'compact' ? '0.2em' : '0.3em',
          borderRadius: '50%',
          backgroundColor: 'var(--color-clay)',
          margin: `0 ${variant === 'compact' ? '0.2em' : '0.3em'}`,
          verticalAlign: variant === 'compact' ? '0.55em' : '0.7em',
        }}
      />
      <span style={{ fontSize: variant === 'compact' ? '1.1em' : '1.4em', color: 'var(--color-text-primary)' }}>OS</span>

      <span
        className="absolute block"
        style={{
          bottom: variant === 'compact' ? '-0.12em' : '-0.15em',
          left: '0',
          width: variant === 'compact' ? '55%' : '60%',
          height: variant === 'compact' ? '2.5px' : '3px',
          background: 'linear-gradient(90deg, var(--color-clay), transparent)',
          borderRadius: '2px',
        }}
      />
    </span>
  );

  const tagline = (
    <span
      className="block tracking-[0.25em] uppercase"
      style={{
        fontFamily: '"Inter", ui-sans-serif, system-ui',
        fontSize: variant === 'compact' ? '0.5em' : '0.55em',
        color: 'var(--color-text-tertiary)',
        fontWeight: 500,
        marginTop: variant === 'compact' ? '0.15em' : '0.2em',
        letterSpacing: '0.25em',
      }}
    >
      AI SEO Platform
    </span>
  );

  return (
    <div className={`inline-flex flex-col items-start select-none ${className}`} style={{ fontFamily: '"Dancing Script", cursive' }}>
      {signature}
      {variant === 'full' && tagline}
    </div>
  );
}
