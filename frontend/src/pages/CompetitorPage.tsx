import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { competitorApi, siteApi, Competitor, ContentGapReport, Site } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const POLL_INTERVAL_MS = 3000;

// ── Status banners ────────────────────────────────────────────────────────────
function StatusBanner({ report }: { report: ContentGapReport }) {
  if (report.status === 'queued') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 px-5 py-4">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Analysis queued — starting shortly…</p>
      </div>
    );
  }
  if (report.status === 'running') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-900/20 px-5 py-4">
        <svg className="h-4 w-4 flex-shrink-0 animate-spin text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-sky-800 dark:text-sky-300">Crawling & analyzing…</p>
          <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-400/60">
            This may take 2–5 minutes — crawling both sites and running AI analysis.
          </p>
        </div>
      </div>
    );
  }
  if (report.status === 'failed') {
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
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Analysis failed</p>
          {report.error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/70">{report.error}</p>}
        </div>
      </div>
    );
  }
  return null;
}

// ── Gap row ────────────────────────────────────────────────────────────────────
function GapRow({
  gap,
}: {
  gap: { topic: string; competitorHasIt: boolean; userHasIt: boolean; opportunity: string };
}) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2 flex items-center gap-2">
        <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">{gap.topic}</p>
        <div className="ml-auto flex items-center gap-1.5">
          {gap.competitorHasIt ? (
            <span className="rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400">
              Competitor ✓
            </span>
          ) : (
            <span className="text-[var(--color-text-tertiary)] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium">
              Competitor ✗
            </span>
          )}
          {gap.userHasIt ? (
            <span className="rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-400">
              You ✓
            </span>
          ) : (
            <span className="rounded border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-400">
              You ✗
            </span>
          )}
        </div>
      </div>
      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{gap.opportunity}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompetitorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);

  const [site, setSite] = useState<Site | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Add competitor form
  const [showForm, setShowForm] = useState(false);
  const [compDomain, setCompDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Reports state keyed by competitorId
  const [reports, setReports] = useState<Record<string, ContentGapReport | null>>({});

  // Active competitor for viewing report
  const [activeCompetitorId, setActiveCompetitorId] = useState<string | null>(null);

  // Analysis launch state
  const [analyzing, setAnalyzing] = useState<string | null>(null); // competitorId being analyzed
  const [analyzeError, setAnalyzeError] = useState('');

  // Polling refs
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Load site + competitors + latest reports on mount
  useEffect(() => {
    if (!siteId) return;
    (async () => {
      const siteRes = await siteApi.get(siteId);
      if (siteRes.success) setSite(siteRes.data);

      const compRes = await competitorApi.list(siteId);
      setFetching(false);
      if (compRes.success) {
        setCompetitors(compRes.data);
        if (compRes.data.length > 0) setActiveCompetitorId(compRes.data[0]._id);

        // Fetch latest reports for each competitor
        const reportMap: Record<string, ContentGapReport | null> = {};
        for (const c of compRes.data) {
          const rRes = await competitorApi.latestReport(c._id);
          reportMap[c._id] = rRes.success ? rRes.data : null;
        }
        setReports(reportMap);
      } else {
        setFetchError(compRes.success === false ? compRes.error : 'Failed to load competitors');
      }
    })();
  }, [siteId]);

  // Poll any report that's queued/running
  useEffect(() => {
    if (!activeCompetitorId) return;
    const activeReport = reports[activeCompetitorId];
    if (!activeReport) return;

    if (activeReport.status === 'queued' || activeReport.status === 'running') {
      stopPolling();
      pollRef.current = setInterval(async () => {
        if (!activeCompetitorId) return;
        const rRes = await competitorApi.latestReport(activeCompetitorId);
        if (rRes.success) {
          setReports((prev) => ({ ...prev, [activeCompetitorId]: rRes.data }));
          if (rRes.data.status === 'done' || rRes.data.status === 'failed') stopPolling();
        }
      }, POLL_INTERVAL_MS);
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [activeCompetitorId, activeCompetitorId ? reports[activeCompetitorId]?.status : undefined, stopPolling]);

  async function handleAddCompetitor() {
    if (!siteId || !compDomain.trim()) return;
    setAddError('');
    setAdding(true);
    const res = await competitorApi.add(siteId, compDomain.trim());
    setAdding(false);
    if (!res.success) {
      setAddError(res.success === false ? res.error : 'Failed');
      addToast('error', `Failed to add competitor: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }
    setCompetitors((prev) => [res.data, ...prev]);
    setReports((prev) => ({ ...prev, [res.data._id]: null }));
    setActiveCompetitorId(res.data._id);
    setCompDomain('');
    setShowForm(false);
    addToast('success', `Competitor ${compDomain.trim()} added`);
  }

  async function handleAnalyze(competitorId: string) {
        setAnalyzeError('');
    setAnalyzing(competitorId);

    const res = await competitorApi.analyze(competitorId);
    setAnalyzing(null);

    if (!res.success) {
      setAnalyzeError(res.success === false ? res.error : 'Failed');
      addToast('error', `Analysis failed: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }
    addToast('info', 'Gap analysis started — this may take 2–5 minutes');

    // Optimistically set status
    setReports((prev) => ({
      ...prev,
      [competitorId]: {
        _id: res.data.reportId,
        siteId: siteId!,
        competitorId,
        status: 'queued',
        createdAt: new Date().toISOString(),
      },
    }));

    // Start polling
    stopPolling();
    pollRef.current = setInterval(async () => {
      if (!competitorId) return;
      const rRes = await competitorApi.latestReport(competitorId);
      if (rRes.success) {
        setReports((prev) => ({ ...prev, [competitorId]: rRes.data }));
        if (rRes.data.status === 'done' || rRes.data.status === 'failed') stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  const activeReport = activeCompetitorId ? reports[activeCompetitorId] : null;
  const activeCompetitor = competitors.find((c) => c._id === activeCompetitorId);
  const gaps = activeReport?.gaps ?? [];
  const isActive = activeReport?.status === 'queued' || activeReport?.status === 'running';

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
          <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Competitor Analysis</span>
          <h1 className="font-heading text-[var(--color-text-primary)] mt-0.5 text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
          <p className="text-[var(--color-text-secondary)] mt-0.5 text-sm">Add competitors and identify content gaps</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setAddError('');
          }}
        >
          {showForm ? 'Cancel' : '+ Add Competitor'}
        </Button>
      </div>

      {/* Add competitor form */}
      {showForm && (
        <div className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 mb-6 rounded-xl border p-5">
          <h2 className="font-heading text-[var(--color-text-primary)] mb-1 text-sm font-semibold">Add a competitor</h2>
          <p className="text-[var(--color-text-tertiary)] mb-4 text-xs">
            Enter the competitor's bare domain. Their publicly-accessible pages will be crawled for gap analysis.
          </p>
          <div className="flex gap-3">
            <input
              placeholder="competitor.com"
              value={compDomain}
              onChange={(e) => setCompDomain(e.target.value)}
              className="text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]/60 focus:ring-[var(--color-accent)]/20 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm transition-colors hover:border-[var(--color-border)] focus:ring-1 focus:outline-none"
              autoFocus
            />
            <Button size="sm" onClick={handleAddCompetitor} loading={adding}>
              Add
            </Button>
          </div>
          {addError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{addError}</p>}
        </div>
      )}

      {analyzeError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {analyzeError}
        </div>
      )}

      {/* Loading */}
      {fetching ? (
        <LoadingSkeleton rows={3} height="h-20" />
      ) : fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {fetchError}
        </div>
      ) : competitors.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-7 w-7">
              <circle cx="4" cy="8" r="3" />
              <circle cx="12" cy="8" r="3" />
              <line x1="7" y1="8" x2="9" y2="8" />
            </svg>
          }
          title="No competitors added yet"
          description="Add a competitor domain above to start gap analysis and identify content opportunities."
          action={{
            label: '+ Add Competitor',
            onClick: () => {
              setShowForm(true);
              setAddError('');
            },
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Competitor tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {competitors.map((c) => (
              <button
                key={c._id}
                onClick={() => setActiveCompetitorId(c._id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeCompetitorId === c._id
                    ? 'bg-[var(--color-accent)]/20 text-[var(--color-text-primary)] border-[var(--color-accent)]/30'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)] border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {c.domain}
              </button>
            ))}
          </div>

          {/* Competitor details + analyze button */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">{activeCompetitor?.domain}</p>
                <p className="text-[var(--color-text-tertiary)] mt-0.5 text-xs">
                  Added {new Date(activeCompetitor?.createdAt ?? '').toLocaleDateString()}
                  {activeCompetitor?.lastCrawledAt && (
                    <> · Last crawled {new Date(activeCompetitor.lastCrawledAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAnalyze(activeCompetitorId!)}
                loading={analyzing === activeCompetitorId}
                disabled={isActive}
              >
                {isActive ? 'Analyzing…' : activeReport ? 'Re-analyze' : 'Analyze Gaps'}
              </Button>
            </div>

            {/* Daily cap notice */}
            <p className="text-[var(--color-text-tertiary)] text-[10px] italic">
              Limited to 5 analyses per site per day to prevent excessive crawling.
            </p>
          </div>

          {/* Report status */}
          {activeReport && activeReport.status !== 'done' && <StatusBanner report={activeReport} />}

          {/* No report */}
          {!activeReport && !isActive && (
            <EmptyState
              title="No analysis yet"
              description='Click "Analyze Gaps" to compare content coverage between your site and this competitor.'
            />
          )}

          {/* Report results */}
          {activeReport?.status === 'done' && gaps.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">Content Gaps ({gaps.length})</p>
                <p className="text-[var(--color-text-tertiary)] text-xs">
                  {site?.domain} vs {activeCompetitor?.domain}
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {gaps.map((gap, i) => (
                  <GapRow key={i} gap={gap} />
                ))}
              </div>
            </div>
          )}

          {activeReport?.status === 'done' && gaps.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
              <p className="text-[var(--color-text-tertiary)] text-sm">No significant content gaps found</p>
              <p className="text-[var(--color-text-tertiary)] mt-1 text-xs">Your site appears to cover similar topics as the competitor</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
