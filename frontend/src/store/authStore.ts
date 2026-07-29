import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

/**
 * JWT is stored in-memory (Zustand) — never in localStorage or a cookie.
 * This eliminates XSS token-theft risk. Trade-off: the user is logged out
 * on page refresh and must re-authenticate. For a future "remember me"
 * feature, the recommended upgrade is httpOnly cookies managed server-side.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
  clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
}));
