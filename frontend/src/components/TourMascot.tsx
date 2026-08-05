/**
 * TourMascot — cheerful flat-design cartoon mascot for the Welcome Tour.
 *
 * A friendly young boy character with big expressive eyes, warm smile, and
 * simple rounded features. Uses ONLY our existing theme color tokens
 * (clay/navy/cream) so he automatically adapts to light/dark mode.
 *
 * Idle animations (CSS keyframes, transform-only):
 *   - Gentle breathing/bob (mascot-bob, 3s)
 *   - Occasional blink (mascot-blink, 5s, via eye shape swap)
 *   - Wave on appear (mascot-wave, 1.2s, one-shot)
 *
 * Respects prefers-reduced-motion (animations disabled).
 */
import { useEffect, useState } from 'react';

interface TourMascotProps {
  /** Show the wave animation on mount */
  waving?: boolean;
  /** Override height (default 140px) */
  height?: number;
  className?: string;
}

export default function TourMascot({ waving = false, height = 140, className = '' }: TourMascotProps) {
  const [blinking, setBlinking] = useState(false);

  /* Blink cycle — every ~3.5s, close eyes for 150ms */
  useEffect(() => {
    const iv = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  return (
    <svg
      viewBox="0 0 120 180"
      fill="none"
      className={`tour-mascot ${waving ? 'tour-mascot-wave' : ''} ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {/* ── Body / shirt ──────────────────────────────────────────── */}
      <rect x="38" y="78" width="44" height="38" rx="10" fill="var(--color-accent)" />

      {/* ── Left arm ──────────────────────────────────────────────── */}
      <rect x="28" y="82" width="14" height="28" rx="7" fill="var(--color-accent)" transform="rotate(-5 35 82)" />

      {/* ── Right arm (waving) ────────────────────────────────────── */}
      <g className={waving ? 'mascot-arm-wave' : ''}>
        <rect x="78" y="76" width="14" height="28" rx="7" fill="var(--color-accent)" transform="rotate(15 85 82)" />
        {/* Hand */}
        <circle cx="86" cy="76" r="7" fill="var(--color-cream-soft)" />
      </g>

      {/* ── Neck ──────────────────────────────────────────────────── */}
      <rect x="52" y="72" width="16" height="10" rx="5" fill="var(--color-cream-soft)" />

      {/* ── Head ──────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="48" rx="28" ry="30" fill="var(--color-cream-soft)" />

      {/* ── Hair ──────────────────────────────────────────────────── */}
      <path
        d="M32 42c0-18 12-30 28-30s28 12 28 30c0-6-4-20-12-24s-14 2-16 2-6-6-14-2-14 18-14 24z"
        fill="var(--color-navy)"
      />
      {/* Hair tuft */}
      <path d="M52 12c2-4 8-6 12-4s4 6 2 8c-2-3-6-5-10-4h-4z" fill="var(--color-navy)" />

      {/* ── Eyes ──────────────────────────────────────────────────── */}
      {blinking ? (
        /* Blink — closed eyes */
        <>
          <line x1="44" y1="46" x2="54" y2="46" stroke="var(--color-navy)" strokeWidth="2" strokeLinecap="round" />
          <line x1="66" y1="46" x2="76" y2="46" stroke="var(--color-navy)" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        /* Open eyes — big expressive */
        <>
          {/* Eye whites */}
          <ellipse cx="49" cy="46" rx="8" ry="9" fill="white" />
          <ellipse cx="71" cy="46" rx="8" ry="9" fill="white" />
          {/* Pupils */}
          <circle cx="51" cy="47" r="4.5" fill="var(--color-navy)" />
          <circle cx="73" cy="47" r="4.5" fill="var(--color-navy)" />
          {/* Eye shine */}
          <circle cx="53" cy="44" r="1.8" fill="white" />
          <circle cx="75" cy="44" r="1.8" fill="white" />
        </>
      )}

      {/* ── Eyebrows ─────────────────────────────────────────────── */}
      <path d="M41 36c3-3 8-3 11 0" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M68 36c3-3 8-3 11 0" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinecap="round" />

      {/* ── Nose ──────────────────────────────────────────────────── */}
      <ellipse cx="60" cy="54" rx="2.5" ry="2" fill="var(--color-clay)" opacity="0.5" />

      {/* ── Mouth — warm smile ────────────────────────────────────── */}
      <path d="M50 60c4 6 16 6 20 0" stroke="var(--color-navy)" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* ── Cheek blush ───────────────────────────────────────────── */}
      <circle cx="38" cy="56" r="5" fill="var(--color-accent)" opacity="0.15" />
      <circle cx="82" cy="56" r="5" fill="var(--color-accent)" opacity="0.15" />

      {/* ── Pants ─────────────────────────────────────────────────── */}
      <rect x="38" y="112" width="20" height="22" rx="4" fill="var(--color-navy)" />
      <rect x="62" y="112" width="20" height="22" rx="4" fill="var(--color-navy)" />

      {/* ── Shoes ─────────────────────────────────────────────────── */}
      <ellipse cx="48" cy="137" rx="14" ry="6" fill="var(--color-clay)" />
      <ellipse cx="72" cy="137" rx="14" ry="6" fill="var(--color-clay)" />

      {/* ── Shirt collar accent ───────────────────────────────────── */}
      <path d="M48 78l12 6 12-6" stroke="var(--color-cream)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
