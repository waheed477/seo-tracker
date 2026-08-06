import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { gscApi, siteApi, RankingsData, Site } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function getFriendlyErrorMessage(err: string | null): string {
  if (!err) return 'Unknown error';
  if (err === 'GSC_PROPERTY_NOT_VERIFIED') {
    return 'This domain is not verified in your connected Google Search Console account.';
  }
  if (err === 'GSC_TOKEN_EXPIRED_OR_REVOKED') {
    return 'Your Google Search Console authorization has expired or been revoked. Please reconnect your account to continue.';
  }
  if (err === 'GSC_RATE_LIMIT_EXCEEDED') {
    return 'Google Search Console API rate limit exceeded. Please wait a few minutes before trying to sync again.';
  }
  if (err === 'GSC_API_ERROR') {
    return 'A communication error occurred with the Google Search Console API. Please try again.';
  }
  return err;
}

function VerificationInstructionsBlock({
  domain,
  onRetry,
  retryText,
  loading = false,
}: {
  domain: string;
  onRetry: () => void;
  retryText: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-6 text-left">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40 p-3 rounded-full">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6 text-amber-800 dark:text-amber-400"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v3.5M8 11h.01" />
          </svg>
        </div>
        <h3 className="font-heading text-[var(--color-text-primary)] text-base font-semibold">
          No ranking data available yet
        </h3>
        <p className="text-[var(--color-text-secondary)] text-sm max-w-lg">
          This domain ({domain}) isn't verified in the Google Search Console account you connected.
          To see real ranking data here, verify ownership of this exact domain in Google Search Console first, then reconnect.
        </p>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h4 className="font-heading text-[var(--color-text-primary)] text-xs font-semibold uppercase tracking-wider mb-3">
          How to verify ownership
        </h4>
        <ol className="list-decimal list-inside space-y-2.5 text-xs text-[var(--color-text-secondary)] pl-1">
          <li>
            Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline font-medium">Google Search Console</a>
          </li>
          <li>
            Add <strong>{domain ? `https://${domain}/` : 'your exact domain'}</strong> as a property (use the <strong>"URL prefix"</strong> method for a simple site, or <strong>"Domain"</strong> method if you control DNS)
          </li>
          <li>
            Complete Google's verification step (HTML tag, DNS record, or file upload — whichever method you choose)
          </li>
          <li>
            Once verified, come back here and click <strong>"{retryText}"</strong> to import your data
          </li>
        </ol>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          Open Google Search Console
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="ml-1.5 h-3 w-3">
            <path d="M9 1.5h5.5V7M14.5 1.5L7.5 8.5" />
          </svg>
        </a>
        <Button size="sm" onClick={onRetry} loading={loading}>
          {retryText}
        </Button>
      </div>
    </div>
  );
}

// ── Position chart (lower is better — invert Y axis) ─────────────────────────
function PositionChart({ data }: { data: RankingsData['positionTrend'] }) {
  if (data.length === 0) return null;

  // Recharts: to invert Y axis for position (lower = better), use reversed
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="font-heading text-[var(--color-text-primary)] mb-1 text-sm font-semibold">Average Position Over Time</p>
      <p className="text-[var(--color-text-tertiary)] mb-4 text-[10px]">Lower is better — data from Google Search Console</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              reversed
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              domain={[0, 'auto']}
              label={{
                value: 'Position',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'var(--color-text-tertiary)' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: 12,
                color: 'var(--color-text-primary)',
              }}
              formatter={(value) => [`Position ${value}`, 'Avg Position']}
            />
            <Area type="monotone" dataKey="avgPosition" stroke="var(--color-accent)" strokeWidth={2} fill="url(#posGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Clicks + Impressions chart ────────────────────────────────────────────────
function ClicksChart({ data }: { data: RankingsData['positionTrend'] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="font-heading text-[var(--color-text-primary)] mb-1 text-sm font-semibold">Clicks & Impressions</p>
      <p className="text-[var(--color-text-tertiary)] mb-4 text-[10px]">From Google Search Console</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: 12,
                color: 'var(--color-text-primary)',
              }}
            />
            <Line type="monotone" dataKey="clicks" stroke="var(--color-accent)" strokeWidth={2} dot={false} name="Clicks" />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="var(--color-text-tertiary)"
              strokeWidth={1.5}
              dot={false}
              name="Impressions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Top queries table ─────────────────────────────────────────────────────────
function TopQueriesTable({ queries }: { queries: RankingsData['topQueries'] }) {
  if (queries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
        <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">Top Queries</p>
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-3.5 w-3.5 text-emerald-400/60"
          >
            <path d="M8 1v14M1 8h14" />
          </svg>
          <span className="text-[var(--color-text-tertiary)] text-[10px] italic">Real data from Google Search Console</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-[var(--color-text-tertiary)] px-5 py-2.5 text-left text-[10px] font-medium tracking-wider uppercase">
                Query
              </th>
              <th className="text-[var(--color-text-tertiary)] px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Position
              </th>
              <th className="text-[var(--color-text-tertiary)] px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Clicks
              </th>
              <th className="text-[var(--color-text-tertiary)] px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Impressions
              </th>
              <th className="text-[var(--color-text-tertiary)] px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                CTR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {queries.map((q, i) => (
              <tr key={i} className="transition-colors hover:bg-[var(--color-surface-hover)]">
                <td className="text-[var(--color-text-primary)] max-w-[200px] truncate px-5 py-3 text-sm font-medium">{q.queryText}</td>
                <td className="text-[var(--color-text-secondary)] px-5 py-3 text-right font-mono text-sm">{q.avgPosition}</td>
                <td className="text-[var(--color-text-primary)] px-5 py-3 text-right font-mono text-sm">{q.clicks}</td>
                <td className="text-[var(--color-text-secondary)] px-5 py-3 text-right font-mono text-sm">{q.impressions}</td>
                <td className="text-[var(--color-text-secondary)] px-5 py-3 text-right font-mono text-sm">{(q.ctr * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RankingsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
    const addToast = useToastStore((s) => s.addToast);

  const [site, setSite] = useState<Site | null>(null);
  const [data, setData] = useState<RankingsData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [gscStatus, setGscStatus] = useState<string | null>(null);

  const days = 30;

  // Check GSC connection status from URL params (OAuth callback redirect)
  useEffect(() => {
    const gscParam = searchParams.get('gsc');
    if (gscParam === 'connected') setGscStatus('connected');
    else if (gscParam === 'error') setGscStatus('error');
  }, [searchParams]);

  // Load site + rankings
  useEffect(() => {
    if (!siteId) return;
    (async () => {
      const siteRes = await siteApi.get(siteId);
      if (siteRes.success) setSite(siteRes.data);

      if (siteRes.success && siteRes.data.gscConnected) {
        const rankRes = await gscApi.rankings(siteId, days);
        if (rankRes.success) setData(rankRes.data);
        else setFetchError(rankRes.success === false ? rankRes.error : 'Failed');
      }

      setFetching(false);
    })();
  }, [siteId]);

  async function handleConnectGsc() {
    if (!siteId) return;
    // Redirect browser to the OAuth connect URL
    window.location.href = gscApi.connectUrl(siteId);
  }

  async function handleSync() {
    if (!siteId) return;
    setSyncError('');
    setSyncing(true);
    const res = await gscApi.sync(siteId, days);
    setSyncing(false);

    if (!res.success) {
      const errCode = res.success === false ? res.error : 'Failed';
      setSyncError(errCode);
      if (errCode !== 'GSC_PROPERTY_NOT_VERIFIED') {
        const friendlyError = getFriendlyErrorMessage(errCode);
        addToast('error', `GSC sync failed: ${friendlyError}`);
      }
      return;
    }
    addToast('success', `Synced ${res.data.syncedRows} rows from Google Search Console`);

    // Refresh rankings
    const rankRes = await gscApi.rankings(siteId, days);
    if (rankRes.success) setData(rankRes.data);
  }

  return (
    <div className="fade-in max-w-4xl p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] mb-5 flex items-center gap-1.5 text-xs transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400/50">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to sites
      </button>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Rank Tracker</span>
          <h1 className="font-heading text-[var(--color-text-primary)] mt-0.5 text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
          <p className="text-[var(--color-text-secondary)] mt-0.5 text-sm">Search performance data from Google Search Console</p>
        </div>
        {site?.gscConnected && (
          <Button size="sm" onClick={handleSync} loading={syncing}>
            Sync Data
          </Button>
        )}
      </div>

      {/* GSC not connected */}
      {fetching ? (
        <LoadingSkeleton rows={3} height="h-24" />
      ) : !site?.gscConnected ? (
        <div className="space-y-4">
          {/* GSC connection card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
            <div className="bg-[var(--color-accent)]/15 border-[var(--color-accent)]/25 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-[var(--color-accent)] h-6 w-6"
              >
                <rect x="2" y="9" width="3" height="5" rx="0.5" />
                <rect x="6.5" y="5" width="3" height="9" rx="0.5" />
                <rect x="11" y="2" width="3" height="12" rx="0.5" />
              </svg>
            </div>
            <h2 className="font-heading text-[var(--color-text-primary)] mb-2 text-lg font-semibold">Connect Google Search Console</h2>
            <p className="text-[var(--color-text-secondary)] mx-auto mb-5 max-w-md text-sm">
              Link your Google Search Console account to see real search performance data — rankings, clicks,
              impressions, and CTR. This is the only rank-tracking method in this product; no SERP scraping is used
              anywhere.
            </p>
            <Button size="md" onClick={handleConnectGsc}>
              Connect Search Console
            </Button>
          </div>

          {/* GSC status from OAuth callback */}
          {gscStatus === 'connected' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
              ✓ Google Search Console connected! Click "Sync Data" to pull your first dataset.
            </div>
          )}
          {gscStatus === 'error' && (
            searchParams.get('msg') === 'GSC_PROPERTY_NOT_VERIFIED' ? (
              <VerificationInstructionsBlock domain={site?.domain || ''} onRetry={handleConnectGsc} retryText="Reconnect Search Console" />
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                Connection failed: {getFriendlyErrorMessage(searchParams.get('msg'))}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* GSC status from OAuth callback */}
          {gscStatus === 'connected' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
              ✓ Google Search Console connected successfully!
            </div>
          )}

          {syncError && syncError !== 'GSC_PROPERTY_NOT_VERIFIED' && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
              {getFriendlyErrorMessage(syncError)}
            </div>
          )}

          {fetchError && fetchError !== 'GSC_PROPERTY_NOT_VERIFIED' && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
              {getFriendlyErrorMessage(fetchError)}
            </div>
          )}

          {(syncError === 'GSC_PROPERTY_NOT_VERIFIED' || fetchError === 'GSC_PROPERTY_NOT_VERIFIED') ? (
            <VerificationInstructionsBlock domain={site?.domain || ''} onRetry={handleSync} retryText="Sync Data" loading={syncing} />
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Total Clicks', value: data?.totalClicks ?? 0 },
                  { label: 'Total Impressions', value: data?.totalImpressions ?? 0 },
                  { label: 'Top Queries', value: data?.topQueries.length ?? 0 },
                  { label: 'Days Tracked', value: data?.positionTrend.length ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                    <p className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">{s.label}</p>
                    <p className="font-heading text-[var(--color-text-primary)] mt-0.5 text-lg font-semibold">{s.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* No data yet */}
              {data && data.positionTrend.length === 0 && data.topQueries.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
                  <p className="text-[var(--color-text-tertiary)] text-sm">No ranking data yet</p>
                  <p className="text-[var(--color-text-tertiary)] mt-1 text-xs">Click "Sync Data" to pull your search performance from Google</p>
                  <p className="text-[var(--color-text-tertiary)] mt-2 text-[10px] italic">GSC data is typically 2–3 days behind</p>
                </div>
              )}

              {/* Charts */}
              {data && data.positionTrend.length > 0 && (
                <>
                  <PositionChart data={data.positionTrend} />
                  <ClicksChart data={data.positionTrend} />
                </>
              )}

              {/* Top queries */}
              {data && data.topQueries.length > 0 && <TopQueriesTable queries={data.topQueries} />}
            </>
          )}

          {/* Honest data source label */}
          <div className="flex items-center gap-2 px-2">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400/60"
            >
              <path d="M8 1v14M1 8h14" />
            </svg>
            <p className="text-[var(--color-text-tertiary)] text-[10px] italic">
              All ranking data on this page is from Google Search Console — real search data, not AI estimates.
              (Compare: keyword difficulty scores on the Keyword Intelligence page are AI-estimated and labeled
              accordingly.)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
