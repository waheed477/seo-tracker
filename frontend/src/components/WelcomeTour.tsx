/**
 * WelcomeTour — first-visit overlay with mascot + 4-step stacked card tour.
 *
 * - Shows automatically ONLY on first visit (localStorage: seo-os-tour-seen)
 * - A "Take the tour" link in the navbar can replay it manually
 * - Mascot appears with opening line → "Show me around" → 4 stacked cards
 * - Stacking animation: each new card slides in on top, offset 10px down+right
 * - Keyboard: Escape=close, ArrowRight/Enter=next, ArrowLeft=back, focus trap
 * - prefers-reduced-motion: cross-fade instead of slide, mascot static
 * - Fully responsive: mobile uses single centered card, mascot above
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import TourMascot from './TourMascot';

/* ── Tour step content ────────────────────────────────────────────────────── */
const OPENING_LINE = "So you're the one with 47 SEO tabs open and a spreadsheet nobody reads? Let me fix that.";

const TOUR_STEPS = [
  {
    title: 'One platform, zero duct tape',
    body: 'Audit, research, analyze, plan — all from a single dashboard. No more switching between five tools that don\'t talk to each other.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    ),
  },
  {
    title: 'Technical audits in seconds',
    body: 'Crawl your site, find broken links, missing meta tags, and heading issues — no headless browser, no waiting. Results before your coffee cools.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    title: 'AI agents that actually deliver',
    body: 'Keyword clustering, competitor gap analysis, content reviews — powered by Groq\'s 70B model with structured output. No hallucination in the pipeline.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: 'Your action plan, prioritized',
    body: 'All data synthesized into one prioritized plan. 8–15 trackable items, ranked by impact. No more guessing what to do first.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

/* ── Easing for stacking animation ─────────────────────────────────────────── */
const STACK_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/* ── Component ─────────────────────────────────────────────────────────────── */
interface WelcomeTourProps {
  /** Whether the tour is currently visible */
  open: boolean;
  /** Callback to close the tour */
  onClose: () => void;
}

export default function WelcomeTour({ open, onClose }: WelcomeTourProps) {
  const [phase, setPhase] = useState<'intro' | 'tour'>('intro');
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showIntroButton, setShowIntroButton] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* Detect prefers-reduced-motion */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Typing effect for opening line */
  useEffect(() => {
    if (!open || phase !== 'intro') return;
    setTypedText('');
    setShowIntroButton(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTypedText(OPENING_LINE.slice(0, i));
      if (i >= OPENING_LINE.length) {
        clearInterval(iv);
        setTimeout(() => setShowIntroButton(true), 300);
      }
    }, 28);
    return () => clearInterval(iv);
  }, [open, phase]);

  /* Keyboard handlers */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, phase, step]);

  /* Focus trap */
  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', trap);
    return () => window.removeEventListener('keydown', trap);
  }, [open, phase, step]);

  /* Body scroll lock */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleClose = useCallback(() => {
    localStorage.setItem('seo-os-tour-seen', 'true');
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (phase === 'intro') {
      setPhase('tour');
      setStep(0);
    } else if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [phase, step, handleClose]);

  const handlePrev = useCallback(() => {
    if (phase === 'tour' && step > 0) {
      setStep((s) => s - 1);
    }
  }, [phase, step]);

  if (!open) return null;

  const isLast = phase === 'tour' && step === TOUR_STEPS.length - 1;

  return (
    <div
      ref={overlayRef}
      className="tour-overlay fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Content */}
      <div
        className={`tour-content relative z-10 flex max-h-[90vh] w-full max-w-3xl items-end justify-center gap-6 px-4 sm:px-6
          ${reducedMotion ? '' : 'tour-enter'}`}
      >
        {/* ── Mascot ──────────────────────────────────────────────── */}
        <div className="tour-mascot-wrap hidden sm:flex flex-col items-center shrink-0">
          <TourMascot waving={phase === 'intro'} height={140} />

          {/* Speech bubble — intro phase */}
          {phase === 'intro' && (
            <div className="mt-3 relative max-w-[220px]">
              <div className="rounded-2xl rounded-bl-sm bg-[var(--color-surface)] border border-[var(--color-border)] p-4 shadow-elevated">
                <p className="text-[var(--color-text-primary)] text-sm leading-relaxed font-body">
                  {typedText}
                  <span className="inline-block w-0.5 h-4 bg-[var(--color-accent)] ml-0.5 align-text-bottom animate-pulse" />
                </p>
              </div>
              {/* Bubble tail */}
              <div className="absolute -bottom-2 left-4 h-0 w-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[var(--color-border)]" />
            </div>
          )}
        </div>

        {/* ── Cards area ──────────────────────────────────────────── */}
        <div className="flex-1 max-w-md">
          {/* Mobile mascot + speech bubble */}
          {phase === 'intro' && (
            <div className="sm:hidden flex flex-col items-center mb-4">
              <TourMascot waving height={100} />
              <div className="mt-2 max-w-[260px]">
                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3 shadow-elevated">
                  <p className="text-[var(--color-text-primary)] text-sm leading-relaxed">
                    {typedText}
                    <span className="inline-block w-0.5 h-4 bg-[var(--color-accent)] ml-0.5 align-text-bottom animate-pulse" />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Intro phase: show me around button ─────────────────── */}
          {phase === 'intro' && (
            <div
              className={`flex flex-col items-center gap-3 transition-all duration-500 ${showIntroButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            >
              <button
                onClick={handleNext}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] rounded-xl px-8 py-3 text-base font-semibold transition-all hover:shadow-lg"
              >
                Show me around →
              </button>
              <button
                onClick={handleClose}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] text-sm transition-colors"
              >
                Skip tour
              </button>
            </div>
          )}

          {/* ── Tour phase: stacked cards ──────────────────────────── */}
          {phase === 'tour' && (
            <div className="relative">
              {/* Background stack — peeking cards behind the active one */}
              {Array.from({ length: step }, (_, i) => i).map((i) => (
                <div
                  key={`stack-${i}`}
                  className="absolute inset-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                  style={{
                    transform: `translate(${(i + 1) * 10}px, ${(i + 1) * 10}px)`,
                    boxShadow: `0 ${2 + i * 2}px ${8 + i * 4}px rgba(0,0,0,0.08)`,
                    opacity: 0.5,
                  }}
                />
              ))}

              {/* Active card */}
              <div
                className={`tour-card relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 ${reducedMotion ? '' : 'tour-card-enter'}`}
                style={{
                  boxShadow: `0 ${4 + step * 2}px ${16 + step * 4}px rgba(0,0,0,0.1)`,
                  transition: reducedMotion ? 'opacity 0.3s ease' : `transform 0.4s ${STACK_EASE}, opacity 0.4s ease`,
                }}
              >
                {/* Step content */}
                <div className="mb-5">
                  <div className="text-[var(--color-accent)] mb-3">
                    {TOUR_STEPS[step].icon}
                  </div>
                  <h3 className="font-heading text-[var(--color-text-primary)] mb-2 text-xl font-bold">
                    {TOUR_STEPS[step].title}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    {TOUR_STEPS[step].body}
                  </p>
                </div>

                {/* Progress dots */}
                <div className="mb-5 flex items-center gap-2">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === step
                          ? 'w-6 bg-[var(--color-accent)]'
                          : i < step
                            ? 'w-2 bg-[var(--color-accent)]/50'
                            : 'w-2 bg-[var(--color-border)]'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-[var(--color-text-tertiary)] text-xs font-medium">
                    {step + 1} of {TOUR_STEPS.length}
                  </span>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleClose}
                    className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] text-sm transition-colors"
                  >
                    Skip tour
                  </button>
                  <div className="flex items-center gap-2">
                    {step > 0 && (
                      <button
                        onClick={handlePrev}
                        className="border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-text)] rounded-lg px-5 py-2 text-sm font-semibold transition-all hover:shadow-lg"
                    >
                      {isLast ? "Let's go →" : 'Next'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
