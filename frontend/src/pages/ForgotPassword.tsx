import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import Footer from '../components/Footer';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    setLoading(true);
    const result = await authApi.forgotPassword(email);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setMessage('If an account exists for that email, reset instructions have been sent.');
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
            <h1 className="font-heading text-[var(--color-text-primary)] mb-1 text-xl font-semibold">Forgot password?</h1>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">Enter your email to receive a reset link.</p>

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
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Send reset link
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
