/**
 * Tests for the Register form.
 *
 * Verifies: form rendering, client-side password length validation,
 * and error display from API responses.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from './Register';

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

function renderRegister() {
  return render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>,
  );
}

describe('Register form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name, email, and password inputs', () => {
    renderRegister();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows a validation error for short passwords', async () => {
    renderRegister();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // The error banner shows "Password must be at least 8 characters"
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('navigates on successful registration', async () => {
    const { authApi } = await import('../api/api');
    (authApi.register as any).mockResolvedValue({
      success: true,
      data: {
        token: 'fake-jwt-token',
        user: { id: '123', email: 'test@test.com', name: 'Test User' },
      },
    });

    renderRegister();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app');
    });
  });

  it('displays API error messages', async () => {
    const { authApi } = await import('../api/api');
    (authApi.register as any).mockResolvedValue({
      success: false,
      error: 'Email already registered',
    });

    renderRegister();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    });
  });
});
