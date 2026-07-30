import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    const result = await authApi.register(email, password, name);
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,94,60,0.08)_0%,transparent_60%)]" />

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="fade-in relative w-full max-w-sm">
          <Logo variant="full" theme="dark" className="mb-8" />

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
            <h1 className="font-heading text-cream mb-1 text-xl font-semibold">Create your account</h1>
            <p className="text-sage/60 mb-6 text-sm">Start optimising in minutes</p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/30 px-3.5 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                autoComplete="name"
                required
              />
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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                hint="At least 8 characters"
                required
              />
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Create account
              </Button>
            </form>
          </div>

          <p className="text-sage/50 mt-5 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-clay hover:text-clay/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
