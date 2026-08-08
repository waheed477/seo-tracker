import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workspaceApi, Workspace } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function BillingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);
  const billingEnabled = useAuthStore((s) => s.billingEnabled);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingWs, setLoadingWs] = useState<string | null>(null);

  // Check for success/cancel redirect from Stripe
  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current) return;
    if (successParam === 'true') {
      hasHandledRef.current = true;
      addToast('success', 'Payment successful! Your plan is being activated...');
    } else if (canceledParam === 'true') {
      hasHandledRef.current = true;
      addToast('info', 'Checkout was canceled. You can upgrade anytime.');
    }
  }, [successParam, canceledParam, addToast]);

  useEffect(() => {
        workspaceApi.list().then((res) => {
      setFetching(false);
      if (res.success) setWorkspaces(res.data);
    });
  }, []);

  // Poll for plan upgrade after successful checkout
  useEffect(() => {
    if (successParam !== 'true') return;
    let pollCount = 0;
    const poll = setInterval(async () => {
      pollCount++;
      const res = await workspaceApi.list();
      if (res.success) {
        const anyPro = res.data.some((ws) => ws.plan === 'pro');
        if (anyPro || pollCount > 10) {
          setWorkspaces(res.data);
          clearInterval(poll);
          if (anyPro) addToast('success', 'Pro plan activated! Enjoy unlimited sites.');
        }
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [successParam, addToast]);

  async function handleUpgrade(workspaceId: string) {
        setLoadingWs(workspaceId);
    const res = await workspaceApi.createCheckout(workspaceId);
    setLoadingWs(null);
    if (res.success) {
      window.location.href = res.data.url;
    } else {
      addToast('error', `Failed to start checkout: ${res.error}`);
    }
  }

  async function handleManageBilling(workspaceId: string) {
        setLoadingWs(workspaceId);
    const res = await workspaceApi.createPortal(workspaceId);
    setLoadingWs(null);
    if (res.success) {
      window.location.href = res.data.url;
    } else {
      addToast('error', `Failed to open billing portal: ${res.error}`);
    }
  }

  if (fetching) {
    return (
      <div className="fade-in p-6 lg:p-8">
        <LoadingSkeleton rows={3} height="h-32" />
      </div>
    );
  }

  return (
    <div className="fade-in max-w-3xl p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => navigate('/app')}
        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] mb-5 flex items-center gap-1.5 text-xs transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Dashboard
      </button>

      <div className="mb-7">
        <h1 className="font-heading text-[var(--color-text-primary)] text-xl font-semibold">Billing & Plans</h1>
        <p className="text-[var(--color-text-secondary)] mt-0.5 text-sm">Manage your subscription and plan for each workspace</p>
      </div>

      <div className="space-y-4">
        {workspaces.map((ws) => (
          <div
            key={ws._id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">{ws.name}</h2>
                  {ws.plan === 'pro' ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/40 dark:text-emerald-400">
                      PRO
                    </span>
                  ) : (
                    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)]">
                      FREE
                    </span>
                  )}
                </div>
                {ws.plan === 'pro' && ws.planStatus === 'past_due' && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    ⚠ Payment overdue — please update your payment method
                  </p>
                )}
                {ws.plan === 'free' && billingEnabled && (
                  <p className="text-[var(--color-text-tertiary)] mt-1 text-xs">Max 1 site · Upgrade for unlimited</p>
                )}
                {ws.plan === 'free' && !billingEnabled && (
                  <p className="text-[var(--color-text-tertiary)] mt-1 text-xs">All limits removed while billing is being configured</p>
                )}
                {ws.plan === 'pro' && ws.planStatus === 'active' && (
                  <p className="text-[var(--color-text-tertiary)] mt-1 text-xs">Unlimited sites · All features unlocked</p>
                )}
              </div>

              <div>
                {!billingEnabled ? (
                  <span className="text-[var(--color-text-tertiary)] bg-[var(--color-surface-hover)] border-[var(--color-border)] rounded-lg border px-3 py-1.5 text-[10px] sm:text-xs">
                    Billing temporarily disabled
                  </span>
                ) : ws.plan === 'pro' ? (
                  <button
                    onClick={() => handleManageBilling(ws._id)}
                    disabled={loadingWs === ws._id}
                    className="border-[var(--color-accent)]/25 text-[var(--color-accent)] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20 rounded-lg border px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingWs === ws._id ? 'Loading...' : 'Manage Billing'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(ws._id)}
                    disabled={loadingWs === ws._id}
                    className="bg-[var(--color-accent)]/25 border-[var(--color-accent)]/40 text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/35 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {loadingWs === ws._id ? 'Loading...' : 'Upgrade to Pro'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test mode notice */}
      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-[var(--color-text-tertiary)] text-xs leading-relaxed">
          <span className="text-[var(--color-text-secondary)] font-medium">Test Mode:</span> Payments are integrated via Stripe in TEST MODE — this demonstrates
          a complete subscription billing flow (Checkout, webhooks, plan lifecycle) without processing real payments.
        </p>
      </div>
    </div>
  );
}
