import { useState, FormEvent } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import Footer from '../components/Footer';

export default function ResetPassword() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Reset token is missing from the URL');
      return;
    }

    setLoading(true);
    const result = await authApi.resetPassword(token, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setAuth(result.data.user, result.data.token);
    setMessage('Your password has been reset. Redirecting to your workspace...');
    setTimeout(() => navigate('/app'), 1200);
  }

  return (
    <div className="bg-[var(--color-bg)] flex min-h-screen flex-col relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--color-accent-rgb),0.08)_0%,transparent_60%)]" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="fade-in relative w-full max-w-sm">
          <Logo variant="full" theme="dark" className="mb-8" />

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7">
            <h1 className="font-heading text-[var(--color-text-primary)] mb-1 text-xl font-semibold">Reset your password</h1>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">Create a new password for your account.</p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/30 px-3.5 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-900/30 px-3.5 py-2.5 text-sm text-emerald-200">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Reset password
              </Button>
            </form>
          </div>

          <p className="text-[var(--color-text-secondary)] mt-5 text-center text-sm">
            Remembered your password?{' '}
            <Link to="/login" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
