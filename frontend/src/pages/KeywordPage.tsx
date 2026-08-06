import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { keywordApi, siteApi, Keyword, KeywordClusters, Site } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

// ── Intent badge colours ──────────────────────────────────────────────────────
const INTENT_STYLES: Record<string, string> = {
  informational: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:border-sky-800/50',
  transactional: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50',
  navigational: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50',
  commercial: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:border-purple-800/50',
};

function DifficultyBar({ value }: { value: number }) {
  const color = value <= 30 ? 'bg-emerald-500' : value <= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--color-surface)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[var(--color-text-secondary)] font-mono text-xs">{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function KeywordPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);

  const [site, setSite] = useState<Site | null>(null);
  const [clusters, setClusters] = useState<KeywordClusters | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Keyword input form
  const [seedText, setSeedText] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');

  // Active cluster tab
  const [activeCluster, setActiveCluster] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      const siteRes = await siteApi.get(siteId);
      if (siteRes.success) setSite(siteRes.data);
      const clusterRes = await keywordApi.clusters(siteId);
      setFetching(false);
      if (clusterRes.success) {
        setClusters(clusterRes.data);
        const keys = Object.keys(clusterRes.data);
        if (keys.length > 0) setActiveCluster(keys[0]);
      } else {
        setFetchError(clusterRes.success === false ? clusterRes.error : 'Failed to load keywords');
      }
    })();
  }, [siteId]);

  async function handleResearch() {
    if (!siteId || !seedText.trim()) return;
    setRunError('');

    // Parse: comma-separated or one-per-line
    const seeds = seedText
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    if (seeds.length === 0) {
      setRunError('Enter at least one keyword');
      return;
    }

    setRunning(true);
    const res = await keywordApi.research(siteId, seeds);
    setRunning(false);

    if (!res.success) {
      setRunError(res.success === false ? res.error : 'Failed');
      addToast('error', `Keyword research failed: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }
    addToast('success', `Found ${res.data.length} keywords across clusters`);

    // Refresh clusters
    const clusterRes = await keywordApi.clusters(siteId);
    if (clusterRes.success) {
      setClusters(clusterRes.data);
      const keys = Object.keys(clusterRes.data);
      if (keys.length > 0) setActiveCluster(keys[0]);
    }

    setSeedText('');
  }

  const clusterNames = clusters ? Object.keys(clusters) : [];
  const activeKeywords = clusters && activeCluster ? (clusters[activeCluster] ?? []) : [];

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
      <div className="mb-6">
        <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Keyword Intelligence</span>
        <h1 className="font-heading text-[var(--color-text-primary)] mt-0.5 text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
      </div>

      {/* Seed keyword input */}
      <div className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 mb-6 rounded-xl border p-5">
        <h2 className="font-heading text-[var(--color-text-primary)] mb-1 text-sm font-semibold">Seed Keywords</h2>
        <p className="text-[var(--color-text-tertiary)] mb-4 text-xs">
          Enter seed keywords (comma-separated or one per line). Groq will expand them, cluster into topic groups,
          assign search intent, and estimate difficulty.
        </p>
        <textarea
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder="content marketing, SEO tools, keyword research"
          rows={3}
          className="text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]/60 focus:ring-[var(--color-accent)]/20 w-full resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm transition-colors hover:border-[var(--color-border)] focus:ring-1 focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" onClick={handleResearch} loading={running}>
            Research Keywords
          </Button>
          {runError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{runError}</p>}
        </div>
        <p className="text-[var(--color-text-tertiary)] mt-3 text-[10px] italic">
          ⚠ Difficulty scores are AI estimates based on general knowledge — they are NOT live search data from any SERP
          tool.
        </p>
      </div>

      {/* Clusters display */}
      {fetching ? (
        <LoadingSkeleton rows={3} height="h-24" />
      ) : fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {fetchError}
        </div>
      ) : clusterNames.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-7 w-7">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <line x1="9.9" y1="9.9" x2="14" y2="14" />
            </svg>
          }
          title="No keywords yet"
          description="Enter seed keywords above to start research. Groq will expand them into clusters with intent and difficulty."
        />
      ) : (
        <div>
          {/* Cluster tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {clusterNames.map((name) => (
              <button
                key={name}
                onClick={() => setActiveCluster(name)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeCluster === name
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-text-primary)] border-[var(--color-accent)]/30'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)] border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {name}
                <span className="text-[var(--color-text-tertiary)] ml-1.5">({clusters![name].length})</span>
              </button>
            ))}
          </div>

          {/* Keywords table */}
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
              <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">{activeCluster}</p>
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400/60">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 5v3.5M8 11h.01" />
                </svg>
                <span className="text-[var(--color-text-tertiary)] text-[10px] italic">AI estimate, not live search data</span>
              </div>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {activeKeywords.map((kw) => (
                <div key={kw._id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--color-surface-hover)]">
                  {/* Keyword */}
                  <p className="font-heading text-[var(--color-text-primary)] min-w-0 flex-1 truncate text-sm font-medium">{kw.keyword}</p>

                  {/* Intent badge */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${INTENT_STYLES[kw.intent] ?? 'text-[var(--color-text-tertiary)] border-[var(--color-border)] bg-[var(--color-surface)]'}`}
                  >
                    {kw.intent}
                  </span>

                  {/* Difficulty bar */}
                  <DifficultyBar value={kw.difficultyEstimate} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
