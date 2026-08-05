import { useThemeStore } from '../store/themeStore';

/**
 * ThemeToggle — sun/moon icon toggle for light/dark mode.
 *
 * Purely a view over the shared themeStore — it holds NO local theme state, so
 * every instance (landing navbar, authenticated navbar, …) always renders the
 * same value and toggling any one of them updates all of them.
 *
 * Persistence, the `dark` class on <html>, and the localStorage key
 * ('seo-os-theme') are all owned by the store. See store/themeStore.ts.
 */
export default function ThemeToggle() {
  const dark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-surface)]"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon — visible in dark mode */}
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={`h-4 w-4 transition-all duration-300 ${
          dark ? 'rotate-0 scale-100 opacity-100' : 'absolute rotate-90 scale-0 opacity-0'
        }`}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <circle cx="10" cy="10" r="3.5" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
      </svg>
      {/* Moon icon — visible in light mode */}
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={`h-4 w-4 transition-all duration-300 ${
          dark ? 'absolute -rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        }`}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <path d="M17.3 12.3A7.5 7.5 0 017.7 2.7a7.5 7.5 0 106 14.6 7.5 7.5 0 003.6-5z" />
      </svg>
    </button>
  );
}
