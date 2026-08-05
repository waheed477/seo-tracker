import { useState } from 'react';
import { workspaceApi } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  currentCount: number;
  limit: number;
}

export default function UpgradeModal({ open, onClose, workspaceId, currentCount, limit }: UpgradeModalProps) {
    const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleUpgrade() {
        setLoading(true);
    const res = await workspaceApi.createCheckout(workspaceId);
    setLoading(false);
    if (res.success) {
      window.location.href = res.data.url;
    } else {
      addToast('error', `Failed to start checkout: ${res.error}`);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] absolute right-4 top-4 transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="mb-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/15">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-5 w-5">
              <path d="M13.5 2L6 10l-3.5-3" />
            </svg>
          </div>
          <h3 className="font-heading text-[var(--color-text-primary)] text-lg font-bold">Free tier limit reached</h3>
        </div>

        <p className="text-[var(--color-text-secondary)] mb-5 text-sm leading-relaxed">
          You&apos;re using <span className="text-[var(--color-text-primary)] font-semibold">{currentCount} of {limit}</span> sites on the Free plan.
          Upgrade to Pro for unlimited sites, unlimited audits, and all features — no restrictions.
        </p>

        <div className="mb-5 space-y-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-3.5 w-3.5 shrink-0">
              <path d="M13.5 2L6 10l-3.5-3" />
            </svg>
            <span className="text-[var(--color-text-secondary)] text-xs">Unlimited sites per workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-3.5 w-3.5 shrink-0">
              <path d="M13.5 2L6 10l-3.5-3" />
            </svg>
            <span className="text-[var(--color-text-secondary)] text-xs">Unlimited audits & keyword research</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-3.5 w-3.5 shrink-0">
              <path d="M13.5 2L6 10l-3.5-3" />
            </svg>
            <span className="text-[var(--color-text-secondary)] text-xs">Priority AI action plans</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)] rounded-lg border px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Stay on Free
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="bg-[var(--color-accent)]/25 border-[var(--color-accent)]/40 text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/35 flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Redirecting...' : 'Upgrade to Pro →'}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-[var(--color-text-tertiary)]">
          Test Mode — no real payments are processed
        </p>
      </div>
    </div>
  );
}
