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
  setAuth: (user: AuthUser, token?: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token = null) => set({ user, token, isAuthenticated: true }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
}));
