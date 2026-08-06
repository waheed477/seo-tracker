/**
 * StatusBanner — shared status message container for async job states.
 * Used by AuditPage, CompetitorPage, ActionPlanPage for queued/running/failed banners.
 *
 * Contrast rules:
 *  - Light mode: dark text on very light tinted background
 *  - Dark mode: light text on dark tinted background
 *  - Sub-text uses a slightly muted variant but still readable
 */

interface StatusBannerProps {
  variant: 'queued' | 'running' | 'failed';
  title: string;
  subtitle?: string;
  error?: string;
}

const bannerStyles = {
  queued: {
    container:
      'border-amber-200 bg-amber-50 dark:border-amber-700/40 dark:bg-amber-900/20',
    dot: 'bg-amber-500 dark:bg-amber-400',
    title: 'text-amber-800 dark:text-amber-200',
  },
  running: {
    container:
      'border-sky-200 bg-sky-50 dark:border-sky-700/40 dark:bg-sky-900/20',
    spinner: 'text-sky-600 dark:text-sky-400',
    title: 'text-sky-800 dark:text-sky-200',
    subtitle: 'text-sky-600 dark:text-sky-300',
  },
  failed: {
    container:
      'border-red-200 bg-red-50 dark:border-red-700/40 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-800 dark:text-red-200',
    error: 'text-red-600 dark:text-red-300',
  },
};

export default function StatusBanner({ variant, title, subtitle, error }: StatusBannerProps) {
  if (variant === 'queued') {
    const s = bannerStyles.queued;
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${s.container}`}>
        <span className={`h-2 w-2 animate-pulse rounded-full ${s.dot}`} />
        <p className={`text-sm font-medium ${s.title}`}>{title}</p>
      </div>
    );
  }

  if (variant === 'running') {
    const s = bannerStyles.running;
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${s.container}`}>
        <svg className={`h-4 w-4 flex-shrink-0 animate-spin ${s.spinner}`} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div>
          <p className={`text-sm font-medium ${s.title}`}>{title}</p>
          {subtitle && <p className={`mt-0.5 text-xs ${s.subtitle}`}>{subtitle}</p>}
        </div>
      </div>
    );
  }

  // failed
  const s = bannerStyles.failed;
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 ${s.container}`}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={`h-4 w-4 flex-shrink-0 ${s.icon}`}
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 5v3.5M8 11h.01" />
      </svg>
      <div>
        <p className={`text-sm font-medium ${s.title}`}>{title}</p>
        {error && <p className={`mt-0.5 text-xs ${s.error}`}>{error}</p>}
      </div>
    </div>
  );
}
