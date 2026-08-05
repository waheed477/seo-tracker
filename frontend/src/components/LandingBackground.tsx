/**
 * LandingBackground — "Signal Network" theme-aware background for the landing page.
 *
 * A subtle mesh of faint connected nodes and lines drifting slowly across the
 * background, evoking crawling / indexing / data connections. Plus floating
 * SEO-relevant icons and data-chip labels that drift gently through the hero area.
 *
 * - Uses only existing CSS custom properties (var(--color-accent), etc.)
 * - CSS animations only (transform / opacity), GPU-friendly
 * - Respects prefers-reduced-motion
 * - Mobile: fewer floating elements
 */

/* ── Signal Network Data ──────────────────────────────────────────────────── */
const networkNodes = [
  { x: 80, y: 72, r: 4, delay: 0 },
  { x: 210, y: 190, r: 3, delay: 1.2 },
  { x: 120, y: 400, r: 5, delay: 2.4 },
  { x: 330, y: 100, r: 3, delay: 0.8 },
  { x: 270, y: 580, r: 3.5, delay: 3.6 },
  { x: 510, y: 65, r: 3, delay: 1.8 },
  { x: 630, y: 300, r: 4, delay: 0.4 },
  { x: 470, y: 540, r: 3, delay: 2.8 },
  { x: 760, y: 170, r: 3.5, delay: 1.5 },
  { x: 920, y: 400, r: 4.5, delay: 0.6 },
  { x: 1060, y: 90, r: 3, delay: 2.0 },
  { x: 1160, y: 340, r: 4, delay: 3.2 },
  { x: 1290, y: 190, r: 3, delay: 0.9 },
  { x: 1360, y: 470, r: 5, delay: 1.4 },
  { x: 1110, y: 620, r: 3, delay: 2.6 },
  { x: 710, y: 670, r: 3.5, delay: 3.8 },
  { x: 340, y: 740, r: 4, delay: 0.3 },
  { x: 170, y: 670, r: 3, delay: 1.9 },
  { x: 960, y: 720, r: 3, delay: 2.2 },
  { x: 1310, y: 720, r: 4, delay: 3.0 },
];

const networkEdges: [number, number][] = [
  [0, 1], [0, 3], [1, 2], [1, 4], [2, 4], [2, 17],
  [3, 5], [3, 6], [4, 7], [5, 6], [5, 8],
  [6, 7], [6, 9], [8, 9], [8, 10], [9, 11],
  [10, 11], [10, 12], [11, 13], [12, 13],
  [13, 19], [14, 15], [14, 18], [15, 16],
  [16, 17], [18, 19], [7, 15], [9, 14],
];

/* ── Floating Icons ───────────────────────────────────────────────────────── */
const floatingIcons = [
  {
    /* Search / magnifying glass — keyword research */
    x: 4, y: 18, size: 20, opacity: 0.12, dur: 14, delay: 0, mobile: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
    ),
  },
  {
    /* Trending up — rank tracking */
    x: 92, y: 15, size: 22, opacity: 0.10, dur: 18, delay: 2.5, mobile: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    /* Link / chain — internal linking audit */
    x: 6, y: 52, size: 18, opacity: 0.11, dur: 16, delay: 4.2, mobile: false,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    /* Shield — security */
    x: 94, y: 48, size: 20, opacity: 0.13, dur: 12, delay: 1.3, mobile: false,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    /* Code brackets — schema / technical SEO */
    x: 10, y: 78, size: 18, opacity: 0.10, dur: 20, delay: 3.1, mobile: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    /* Bar chart — analytics */
    x: 88, y: 75, size: 22, opacity: 0.12, dur: 15, delay: 5.6, mobile: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <rect x="3" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="8" width="4" height="12" rx="1" />
        <rect x="17" y="4" width="4" height="16" rx="1" />
      </svg>
    ),
  },
  {
    /* Check circle — action plan completion */
    x: 42, y: 8, size: 16, opacity: 0.11, dur: 17, delay: 6.8, mobile: false,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    /* Globe — site crawling */
    x: 58, y: 85, size: 18, opacity: 0.10, dur: 19, delay: 7.4, mobile: false,
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-full w-full">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

/* ── Floating Text Chips ──────────────────────────────────────────────────── */
const floatingChips = [
  {
    x: 18, y: 10, dur: 16, delay: 1.2, mobile: true,
    text: 'Core Web Vitals',
    icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-2.5 w-2.5 shrink-0">
        <path d="M7 2L4 10M2 4l3 2-3 2M10 4L7 6l3 2" />
      </svg>
    ),
  },
  {
    x: 82, y: 25, dur: 14, delay: 3.8, mobile: false,
    text: 'Schema detected',
    icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-2.5 w-2.5 shrink-0">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    ),
  },
  {
    x: 3, y: 65, dur: 18, delay: 5.4, mobile: true,
    text: '+12 rankings',
    icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-2.5 w-2.5 shrink-0">
        <polyline points="2 9 6 3 10 9" />
      </svg>
    ),
  },
  {
    x: 82, y: 72, dur: 15, delay: 2.1, mobile: true,
    text: 'Crawl complete',
    icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-2.5 w-2.5 shrink-0">
        <circle cx="6" cy="6" r="4" />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    x: 46, y: 40, dur: 20, delay: 4.6, mobile: false,
    text: '0 broken links',
    icon: (
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-2.5 w-2.5 shrink-0">
        <line x1="2" y1="2" x2="10" y2="10" />
        <line x1="10" y1="2" x2="2" y2="10" />
      </svg>
    ),
  },
];

/* ── Component ────────────────────────────────────────────────────────────── */
export default function LandingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* ── Mesh-gradient glow — multi-stop brand-colour field ──────────── */}
      {/* Gives the page depth + colour; the node network on top gives it a
          distinct "data / SEO" identity. Together they read as intentional. */}
      <div className="landing-mesh" />

      {/* ── Signal network SVG — full viewport, slow drift ──────────────── */}
      <svg
        className="signal-network absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Edges — crawled links between pages */}
          {networkEdges.map(([from, to], i) => (
            <line
              key={`e${i}`}
              x1={networkNodes[from].x}
              y1={networkNodes[from].y}
              x2={networkNodes[to].x}
              y2={networkNodes[to].y}
              stroke="var(--net-edge)"
              strokeWidth="1.1"
            />
          ))}
        {/* Nodes — indexed pages, gently pulsing */}
        {networkNodes.map((n, i) => (
          <circle
            key={`n${i}`}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill="var(--net-node)"
            className="signal-node"
            style={{ animationDelay: `${n.delay}s` }}
          />
        ))}
      </svg>

      {/* ── Floating icons — SEO-relevant, ambient texture ──────────────── */}
      {/* Safe zone: avoid placing floating elements in the central headline/CTA area */}
      {(() => {
        const safeZone = { xMin: 30, xMax: 60, yMin: 18, yMax: 62 };
        return floatingIcons
          .filter((ic) => !(ic.x >= safeZone.xMin && ic.x <= safeZone.xMax && ic.y >= safeZone.yMin && ic.y <= safeZone.yMax))
          .map((ic, i) => (
            <div
              key={`fi${i}`}
              className={`floating-icon absolute ${ic.mobile ? '' : 'hidden md:block'}`}
              style={{
                left: `${ic.x}%`,
                top: `${ic.y}%`,
                width: ic.size,
                height: ic.size,
                color: 'var(--color-accent)',
                opacity: ic.opacity + 0.05,
                animation: `float-icon ${ic.dur}s ease-in-out ${ic.delay}s infinite`,
              }}
            >
              {ic.svg}
            </div>
          ));
      })()}

      {/* ── Floating text chips — data-chip labels ──────────────────────── */}
      {(() => {
        const safeZone = { xMin: 30, xMax: 60, yMin: 18, yMax: 62 };
        return floatingChips
          .filter((ch) => !(ch.x >= safeZone.xMin && ch.x <= safeZone.xMax && ch.y >= safeZone.yMin && ch.y <= safeZone.yMax))
          .map((ch, i) => (
            <div
              key={`fc${i}`}
              className={`floating-chip absolute ${ch.mobile ? '' : 'hidden md:block'}`}
              style={{
                left: `${ch.x}%`,
                top: `${ch.y}%`,
                opacity: 0.55,
                animation: `float-chip ${ch.dur}s ease-in-out ${ch.delay}s infinite`,
              }}
            >
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/50 px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] backdrop-blur-sm">
                <span className="text-[var(--color-accent)]">{ch.icon}</span>
                {ch.text}
              </span>
            </div>
          ));
      })()}
    </div>
  );
}
