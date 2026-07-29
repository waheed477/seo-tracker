/**
 * Tests for the Login form.
 *
 * Verifies: form rendering, validation messages, and error display.
 * API calls are mocked — no real network requests.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';

// Mock the auth API module
vi.mock('../api/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

// Mock the auth store — Zustand selectors call useAuthStore(selectorFn)
const mockAuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
};
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector?: any) => (selector ? selector(mockAuthState) : mockAuthState),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>,
  );
}

describe('Login form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderLogin();
    expect(screen.getByText(/create one/i)).toBeInTheDocument();
  });

  it('displays an error message when login fails', async () => {
    const { authApi } = await import('../api/api');
    (authApi.login as any).mockResolvedValue({
      success: false,
      error: 'Invalid email or password',
    });

    renderLogin();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('navigates on successful login', async () => {
    const { authApi } = await import('../api/api');
    (authApi.login as any).mockResolvedValue({
      success: true,
      data: {
        token: 'fake-jwt-token',
        user: { id: '123', email: 'test@test.com', name: 'Test' },
      },
    });

    renderLogin();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
