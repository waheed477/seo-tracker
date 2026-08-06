import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { actionPlanApi, siteApi, ActionPlan, ActionItem, Site } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const POLL_INTERVAL_MS = 3000;

// ── Agent badge ───────────────────────────────────────────────────────────────
const AGENT_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  technical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', border: 'border-red-200 dark:border-red-800/40', label: 'Technical' },
  content: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-800 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800/40', label: 'Content' },
  competitor: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/40', label: 'Competitor' },
  rankings: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/40', label: 'Rankings' },
  keywords: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40', label: 'Keywords' },
};

// ── Priority badge ────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', border: 'border-red-200 dark:border-red-800/40', label: 'High' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/40', label: 'Medium' },
  low: { bg: 'bg-[var(--color-surface)]', text: 'text-[var(--color-text-tertiary)]', border: 'border-[var(--color-border)]', label: 'Low' },
};

// ── Status dropdown ───────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: ActionItem['status']; label: string; icon: string }[] = [
  { value: 'todo', label: 'To Do', icon: '○' },
  { value: 'in_progress', label: 'In Progress', icon: '◐' },
  { value: 'done', label: 'Done', icon: '●' },
];

// ── Status banner ─────────────────────────────────────────────────────────────
function StatusBanner({ plan }: { plan: ActionPlan }) {
  if (plan.status === 'queued') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 px-5 py-4">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Analyzing all data sources…</p>
      </div>
    );
  }
  if (plan.status === 'running') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-900/20 px-5 py-4">
        <svg className="h-4 w-4 flex-shrink-0 animate-spin text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-sky-800 dark:text-sky-300">Generating your action plan…</p>
          <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-400/60">Analyzing audit, keywords, competitors, and rankings data.</p>
        </div>
      </div>
    );
  }
  if (plan.status === 'failed') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-5 py-4">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 5v3.5M8 11h.01" />
        </svg>
        <div>
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Generation failed</p>
          {plan.error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/70">{plan.error}</p>}
        </div>
      </div>
    );
  }
  return null;
}

// ── Action item card ──────────────────────────────────────────────────────────
function ActionItemCard({
  item,
  onStatusChange,
}: {
  item: ActionItem;
  onStatusChange: (itemId: string, status: string) => void;
}) {
  const agentStyle = AGENT_STYLES[item.agent] || AGENT_STYLES.technical;
  const priorityStyle = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium;
  const isDone = item.status === 'done';

  return (
    <div
      className={`rounded-xl border bg-[var(--color-surface)] transition-all ${isDone ? 'border-[var(--color-border)] opacity-60' : 'border-[var(--color-border)]'}`}
    >
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Status checkbox */}
          <button
            onClick={() => {
              const next = item.status === 'todo' ? 'in_progress' : item.status === 'in_progress' ? 'done' : 'todo';
              onStatusChange(item._id, next);
            }}
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
              item.status === 'done'
                ? 'border-emerald-500 bg-emerald-500'
                : item.status === 'in_progress'
                  ? 'border-amber-500 bg-amber-500/20'
                  : 'hover:border-[var(--color-accent)]/50 border-[var(--color-border)]'
            }`}
          >
            {item.status === 'done' && (
              <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" className="h-3 w-3">
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
            {item.status === 'in_progress' && <div className="h-2 w-2 rounded-full bg-amber-500" />}
          </button>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
              >
                {priorityStyle.label}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${agentStyle.bg} ${agentStyle.text} ${agentStyle.border}`}
              >
                {agentStyle.label}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                  item.status === 'done'
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : item.status === 'in_progress'
                      ? 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'text-[var(--color-text-tertiary)] border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                {STATUS_OPTIONS.find((s) => s.value === item.status)?.label ?? 'To Do'}
              </span>
            </div>
            <p
              className={`font-heading mb-1 text-sm font-semibold ${isDone ? 'text-[var(--color-text-tertiary)] line-through' : 'text-[var(--color-text-primary)]'}`}
            >
              {item.title}
            </p>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{item.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ActionPlanPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);

  const [site, setSite] = useState<Site | null>(null);
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Active filter
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Load site + latest plan
  useEffect(() => {
    if (!siteId) return;
    (async () => {
      const siteRes = await siteApi.get(siteId);
      if (siteRes.success) setSite(siteRes.data);
      else {
        setFetchError(siteRes.error || 'Failed to load site');
        setFetching(false);
        return;
      }

      const planRes = await actionPlanApi.latest(siteId);
      setFetching(false);
      if (planRes.success) {
        setPlan(planRes.data);
      } else if (planRes.error && planRes.error.includes('No action plans found')) {
        setPlan(null);
      } else {
        setFetchError(planRes.error || 'Failed to load action plan');
      }
    })();
  }, [siteId]);

  // Poll when plan is queued/running
  useEffect(() => {
    if (!plan) return;
    if (plan.status === 'queued' || plan.status === 'running') {
      stopPolling();
      pollRef.current = setInterval(async () => {
        if (!siteId) return;
        const res = await actionPlanApi.latest(siteId);
        if (res.success) {
          setPlan(res.data);
          if (res.data.status === 'done' || res.data.status === 'failed') stopPolling();
        }
      }, POLL_INTERVAL_MS);
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [plan?.status, siteId, stopPolling]);

  async function handleGenerate() {
    if (!siteId) return;
    setGenError('');
    setGenerating(true);
    const res = await actionPlanApi.generate(siteId);
    setGenerating(false);
    if (!res.success) {
      setGenError(res.success === false ? res.error : 'Failed');
      addToast('error', `Failed to generate plan: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }
    addToast('info', 'Generating action plan — analyzing all data sources…');

    // Optimistically set
    setPlan({
      _id: res.data.planId,
      siteId: siteId!,
      status: 'queued',
      createdAt: new Date().toISOString(),
    });

    // Start polling
    stopPolling();
    pollRef.current = setInterval(async () => {
      if (!siteId) return;
      const rRes = await actionPlanApi.latest(siteId);
      if (rRes.success) {
        setPlan(rRes.data);
        if (rRes.data.status === 'done' || rRes.data.status === 'failed') stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleStatusChange(itemId: string, status: string) {
    if (!siteId) return;
    const res = await actionPlanApi.updateItem(siteId, itemId, status);
    if (res.success) setPlan(res.data);
  }

  const items = plan?.items ?? [];
  const isActive = plan?.status === 'queued' || plan?.status === 'running';
  const filteredItems = filter === 'all' ? items : items.filter((i) => i.priority === filter);

  const highCount = items.filter((i) => i.priority === 'high').length;
  const medCount = items.filter((i) => i.priority === 'medium').length;
  const lowCount = items.filter((i) => i.priority === 'low').length;
  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <div className="fade-in max-w-4xl p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] mb-5 flex items-center gap-1.5 text-xs transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to sites
      </button>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Action Plan</span>
          <h1 className="font-heading text-[var(--color-text-primary)] mt-0.5 text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
          <p className="text-[var(--color-text-secondary)] mt-0.5 text-sm">AI-synthesized priorities from all your SEO data</p>
        </div>
        <Button size="sm" onClick={handleGenerate} loading={generating} disabled={isActive}>
          {isActive ? 'Generating…' : plan ? 'Regenerate Plan' : 'Generate Action Plan'}
        </Button>
      </div>

      {genError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {genError}
        </div>
      )}

      {/* Loading */}
      {fetching ? (
        <LoadingSkeleton rows={3} height="h-24" />
      ) : !plan || (plan.status === 'done' && items.length === 0) ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-7 w-7">
              <path d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2M9 5a2 2 0 012-2h2M7 11l2 2 4-4" />
            </svg>
          }
          title="No action plan yet"
          description="Generate a plan to get AI-prioritized recommendations based on your audit, keywords, competitors, and rankings data. This is the key feature — it pulls everything together."
        />
      ) : (
        <div className="space-y-4">
          {/* Status banner */}
          {plan.status !== 'done' && <StatusBanner plan={plan} />}

          {/* Summary card */}
          {plan.status === 'done' && plan.summary && (
            <div className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 rounded-xl border p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="bg-[var(--color-accent)]/20 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[var(--color-accent)] h-3.5 w-3.5"
                  >
                    <path d="M8 1v14M1 8h14" />
                  </svg>
                </div>
                <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">AI Summary</p>
              </div>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{plan.summary}</p>
            </div>
          )}

          {/* Progress bar */}
          {plan.status === 'done' && items.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[var(--color-text-tertiary)] text-xs font-medium">Progress</p>
                <p className="text-[var(--color-text-tertiary)] text-xs">
                  {doneCount}/{items.length} completed
                </p>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats strip */}
          {plan.status === 'done' && items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'High Priority', value: highCount, color: 'text-red-600 dark:text-red-400' },
                { label: 'Medium Priority', value: medCount, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Low Priority', value: lowCount, color: 'text-[var(--color-text-secondary)]' },
                { label: 'Completed', value: doneCount, color: 'text-emerald-600 dark:text-emerald-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                  <p className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">{s.label}</p>
                  <p className={`font-heading mt-0.5 text-lg font-semibold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Priority filter */}
          {plan.status === 'done' && items.length > 0 && (
            <div className="flex items-center gap-2">
              {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === f
                      ? 'bg-[var(--color-accent)]/20 text-[var(--color-text-primary)] border-[var(--color-accent)]/30'
                      : 'text-[var(--color-text-secondary)] border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {f === 'all'
                    ? `All (${items.length})`
                    : `${f.charAt(0).toUpperCase() + f.slice(1)} (${f === 'high' ? highCount : f === 'medium' ? medCount : lowCount})`}
                </button>
              ))}
            </div>
          )}

          {/* Action items */}
          {plan.status === 'done' && filteredItems.length > 0 && (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <ActionItemCard key={item._id} item={item} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}

          {/* Data sources note */}
          {plan.status === 'done' && (
            <div className="flex items-center gap-2 px-2 pt-2">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[var(--color-accent)]/50 h-3.5 w-3.5 flex-shrink-0"
              >
                <path d="M8 1v14M1 8h14" />
              </svg>
              <p className="text-[var(--color-text-tertiary)] text-[10px] italic">
                This plan synthesizes data from your Technical Audit, Keyword Research, Competitor Analysis, and Google
                Search Console rankings. Each item is tagged with its source area.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
