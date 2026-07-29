import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await authApi.login(email, password);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setAuth(result.data.token, result.data.user);
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,94,60,0.08)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-sm fade-in">
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-clay flex items-center justify-center">
            <span className="font-heading font-bold text-cream text-base">S</span>
          </div>
          <div>
            <p className="font-heading font-semibold text-cream text-sm leading-tight">SEO OS</p>
            <p className="text-[10px] text-sage/60 tracking-widest uppercase">Operating System</p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-7">
          <h1 className="font-heading text-xl font-semibold text-cream mb-1">Welcome back</h1>
          <p className="text-sm text-sage/60 mb-6">Sign in to your workspace</p>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-sage/50 mt-5">
          No account?{' '}
          <Link to="/register" className="text-clay hover:text-clay/80 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
