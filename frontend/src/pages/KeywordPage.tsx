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
  informational: 'bg-sky-900/40 text-sky-400 border-sky-800/50',
  transactional: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50',
  navigational: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
  commercial: 'bg-purple-900/40 text-purple-400 border-purple-800/50',
};

function DifficultyBar({ value }: { value: number }) {
  const color = value <= 30 ? 'bg-emerald-500' : value <= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sage/70 font-mono text-xs">{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function KeywordPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
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
    if (!token || !siteId) return;
    (async () => {
      const siteRes = await siteApi.get(siteId, token);
      if (siteRes.success) setSite(siteRes.data);
      const clusterRes = await keywordApi.clusters(siteId, token);
      setFetching(false);
      if (clusterRes.success) {
        setClusters(clusterRes.data);
        const keys = Object.keys(clusterRes.data);
        if (keys.length > 0) setActiveCluster(keys[0]);
      } else {
        setFetchError(clusterRes.success === false ? clusterRes.error : 'Failed to load keywords');
      }
    })();
  }, [token, siteId]);

  async function handleResearch() {
    if (!token || !siteId || !seedText.trim()) return;
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
    const res = await keywordApi.research(siteId, seeds, token);
    setRunning(false);

    if (!res.success) {
      setRunError(res.success === false ? res.error : 'Failed');
      addToast('error', `Keyword research failed: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }
    addToast('success', `Found ${res.data.length} keywords across clusters`);

    // Refresh clusters
    const clusterRes = await keywordApi.clusters(siteId, token);
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
        className="text-sage/50 hover:text-sage/80 mb-5 flex items-center gap-1.5 text-xs transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to sites
      </button>

      {/* Header */}
      <div className="mb-6">
        <span className="text-sage/40 text-[10px] tracking-wider uppercase">Keyword Intelligence</span>
        <h1 className="font-heading text-cream mt-0.5 text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
      </div>

      {/* Seed keyword input */}
      <div className="border-clay/20 bg-clay/5 mb-6 rounded-xl border p-5">
        <h2 className="font-heading text-cream mb-1 text-sm font-semibold">Seed Keywords</h2>
        <p className="text-sage/50 mb-4 text-xs">
          Enter seed keywords (comma-separated or one per line). Groq will expand them, cluster into topic groups,
          assign search intent, and estimate difficulty.
        </p>
        <textarea
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder="content marketing, SEO tools, keyword research"
          rows={3}
          className="text-cream placeholder:text-sage/40 focus:border-clay/60 focus:ring-clay/20 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm transition-colors hover:border-white/20 focus:ring-1 focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" onClick={handleResearch} loading={running}>
            Research Keywords
          </Button>
          {runError && <p className="text-xs text-red-400">{runError}</p>}
        </div>
        <p className="text-sage/30 mt-3 text-[10px] italic">
          ⚠ Difficulty scores are AI estimates based on general knowledge — they are NOT live search data from any SERP
          tool.
        </p>
      </div>

      {/* Clusters display */}
      {fetching ? (
        <LoadingSkeleton rows={3} height="h-24" />
      ) : fetchError && !clusters ? (
        <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {fetchError}
        </div>
      ) : clusterNames.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay h-7 w-7">
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
                    ? 'bg-clay/20 text-cream border-clay/30'
                    : 'text-sage/60 hover:text-sage/80 border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                {name}
                <span className="text-sage/40 ml-1.5">({clusters![name].length})</span>
              </button>
            ))}
          </div>

          {/* Keywords table */}
          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <p className="font-heading text-cream text-sm font-semibold">{activeCluster}</p>
              <div className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-3.5 w-3.5 text-amber-400/60"
                >
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 5v3.5M8 11h.01" />
                </svg>
                <span className="text-sage/40 text-[10px] italic">AI estimate, not live search data</span>
              </div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {activeKeywords.map((kw) => (
                <div key={kw._id} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]">
                  {/* Keyword */}
                  <p className="font-heading text-cream min-w-0 flex-1 truncate text-sm font-medium">{kw.keyword}</p>

                  {/* Intent badge */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${INTENT_STYLES[kw.intent] ?? 'text-sage/40 border-white/[0.06] bg-white/[0.04]'}`}
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
