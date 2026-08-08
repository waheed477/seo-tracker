import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  /** In-memory access token — kept alongside the httpOnly cookie so that
   * the Authorization header can be set on every request. This survives
   * in-tab navigation but is cleared on page refresh; the httpOnly cookie
   * re-hydrates it via AuthHydrator. */
  token: string | null;
  isAuthenticated: boolean;
  /**
   * Reflects the backend BILLING_ENABLED env var.
   * Defaults to true until /me is fetched.
   * When false: upgrade buttons are hidden and site-limit enforcement is skipped.
   */
  billingEnabled: boolean;
  setAuth: (user: AuthUser, token?: string | null, billingEnabled?: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  billingEnabled: true, // optimistic default — overwritten once /me responds
  setAuth: (user, token = null, billingEnabled = true) =>
    set({ user, token, isAuthenticated: true, billingEnabled }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false, billingEnabled: true }),
}));
