import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await authApi.login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setAuth(result.data.token, result.data.user);
    navigate('/app');
  }

  return (
    <div className="bg-navy flex min-h-screen flex-col">
      {/* Subtle background texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,94,60,0.08)_0%,transparent_60%)]" />

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="fade-in relative w-full max-w-sm">
          {/* Logo */}
          <Logo variant="full" theme="dark" className="mb-8" />

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
            <h1 className="font-heading text-cream mb-1 text-xl font-semibold">Welcome back</h1>
            <p className="text-sage/60 mb-6 text-sm">Sign in to your workspace</p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/30 px-3.5 py-2.5 text-sm text-red-300">
                {error}
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
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Sign in
              </Button>
            </form>
          </div>

          <p className="text-sage/50 mt-5 text-center text-sm">
            No account?{' '}
            <Link to="/register" className="text-clay hover:text-clay/80 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
