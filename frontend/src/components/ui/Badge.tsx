/**
 * Badge — shared status badge/pill component with proper contrast in both
 * light and dark mode. Use this for ALL status indicators, issue counts,
 * priority labels, and category tags across the app.
 *
 * Variants:
 *  - error:   red family   (broken links, failures, high priority)
 *  - warning: amber family (missing tags, heading issues, medium priority)
 *  - success: emerald family (0 issues, completed, connected)
 *  - info:    sky/blue family (running, content, neutral info)
 *  - neutral: theme tokens (generic labels, roles, counts)
 *
 * Sizes:
 *  - sm: text-[10px] px-1.5 py-0.5  (inline labels next to URLs)
 *  - md: text-xs     px-2   py-0.5  (section badges, default)
 */

interface BadgeProps {
  variant?: 'error' | 'warning' | 'success' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<string, string> = {
  error:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700/50',
  warning:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/50',
  success:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/50',
  info:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-700/50',
  neutral:
    'bg-[var(--color-bg-alt)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
};

const sizeClasses: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
};

export default function Badge({ variant = 'neutral', size = 'md', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium leading-tight ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
