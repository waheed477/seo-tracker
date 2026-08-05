import { create } from 'zustand';

/**
 * themeStore — the SINGLE source of truth for light/dark mode across the
 * entire site (landing page + authenticated app).
 *
 * Mechanism (deliberately reuses what already exists — no second system):
 *   1. `index.html` runs a tiny inline script BEFORE React hydrates. It reads
 *      localStorage['seo-os-theme'] (falling back to prefers-color-scheme) and
 *      sets/removes the `dark` class on <html>. This is what prevents the
 *      flash-of-wrong-theme.
 *   2. This store SEEDS its initial value by reading that same `dark` class —
 *      so React's idea of the theme always agrees with what's already painted,
 *      on every route, including the first render of an authenticated page.
 *   3. Every mutation writes through to BOTH the `dark` class and the same
 *      localStorage key.
 *
 * Because every <ThemeToggle /> subscribes to this one store, toggling in the
 * authenticated navbar instantly re-renders the landing page toggle and vice
 * versa — there is no per-component copy of the theme to drift out of sync.
 */

export type Theme = 'light' | 'dark';

/** Same key the inline script in index.html reads/writes. Do not change one without the other. */
const STORAGE_KEY = 'seo-os-theme';

/** Read the theme that the inline boot script has already applied to <html>. */
function readAppliedTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Write the theme to the DOM + persist it. The DOM class is what CSS keys off. */
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const classes = document.documentElement.classList;
  if (theme === 'dark') {
    classes.add('dark');
  } else {
    classes.remove('dark');
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled — the class is still applied for this session.
  }
}

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readAppliedTheme(),
  isDark: readAppliedTheme() === 'dark',

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme, isDark: theme === 'dark' });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next, isDark: next === 'dark' });
  },
}));
