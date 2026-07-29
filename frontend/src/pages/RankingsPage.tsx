import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { gscApi, siteApi, RankingsData, Site } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// ── Position chart (lower is better — invert Y axis) ─────────────────────────
function PositionChart({ data }: { data: RankingsData['positionTrend'] }) {
  if (data.length === 0) return null;

  // Recharts: to invert Y axis for position (lower = better), use reversed
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="font-heading text-cream mb-1 text-sm font-semibold">Average Position Over Time</p>
      <p className="text-sage/40 mb-4 text-[10px]">Lower is better — data from Google Search Console</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5E3C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B5E3C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(211,212,192,0.08)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'rgba(211,212,192,0.5)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(211,212,192,0.1)' }}
            />
            <YAxis
              reversed
              tick={{ fontSize: 10, fill: 'rgba(211,212,192,0.5)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(211,212,192,0.1)' }}
              domain={[0, 'auto']}
              label={{
                value: 'Position',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'rgba(211,212,192,0.4)' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0A2947',
                border: '1px solid rgba(211,212,192,0.1)',
                borderRadius: '8px',
                fontSize: 12,
                color: '#F3E4C9',
              }}
              formatter={(value) => [`Position ${value}`, 'Avg Position']}
            />
            <Area type="monotone" dataKey="avgPosition" stroke="#8B5E3C" strokeWidth={2} fill="url(#posGrad)" />
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <p className="font-heading text-cream mb-1 text-sm font-semibold">Clicks & Impressions</p>
      <p className="text-sage/40 mb-4 text-[10px]">From Google Search Console</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(211,212,192,0.08)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'rgba(211,212,192,0.5)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(211,212,192,0.1)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(211,212,192,0.5)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(211,212,192,0.1)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0A2947',
                border: '1px solid rgba(211,212,192,0.1)',
                borderRadius: '8px',
                fontSize: 12,
                color: '#F3E4C9',
              }}
            />
            <Line type="monotone" dataKey="clicks" stroke="#8B5E3C" strokeWidth={2} dot={false} name="Clicks" />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="rgba(211,212,192,0.4)"
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
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <p className="font-heading text-cream text-sm font-semibold">Top Queries</p>
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
          <span className="text-sage/40 text-[10px] italic">Real data from Google Search Console</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-sage/40 px-5 py-2.5 text-left text-[10px] font-medium tracking-wider uppercase">
                Query
              </th>
              <th className="text-sage/40 px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Position
              </th>
              <th className="text-sage/40 px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Clicks
              </th>
              <th className="text-sage/40 px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                Impressions
              </th>
              <th className="text-sage/40 px-5 py-2.5 text-right text-[10px] font-medium tracking-wider uppercase">
                CTR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {queries.map((q, i) => (
              <tr key={i} className="transition-colors hover:bg-white/[0.02]">
                <td className="text-cream max-w-[200px] truncate px-5 py-3 text-sm font-medium">{q.queryText}</td>
                <td className="text-sage/70 px-5 py-3 text-right font-mono text-sm">{q.avgPosition}</td>
                <td className="text-cream px-5 py-3 text-right font-mono text-sm">{q.clicks}</td>
                <td className="text-sage/70 px-5 py-3 text-right font-mono text-sm">{q.impressions}</td>
                <td className="text-sage/70 px-5 py-3 text-right font-mono text-sm">{(q.ctr * 100).toFixed(1)}%</td>
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
  const { token } = useAuthStore();
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
    if (!token || !siteId) return;
    (async () => {
      const siteRes = await siteApi.get(siteId, token);
      if (siteRes.success) setSite(siteRes.data);

      if (siteRes.success && siteRes.data.gscConnected) {
        const rankRes = await gscApi.rankings(siteId, days, token);
        if (rankRes.success) setData(rankRes.data);
        else setFetchError(rankRes.success === false ? rankRes.error : 'Failed');
      }

      setFetching(false);
    })();
  }, [token, siteId]);

  async function handleConnectGsc() {
    if (!token || !siteId) return;
    // Redirect browser to the OAuth connect URL
    window.location.href = gscApi.connectUrl(siteId, token);
  }

  async function handleSync() {
    if (!token || !siteId) return;
    setSyncError('');
    setSyncing(true);
    const res = await gscApi.sync(siteId, token, days);
    setSyncing(false);

    if (!res.success) {
      setSyncError(res.success === false ? res.error : 'Failed');
      addToast('error', `GSC sync failed: ${res.success === false ? res.error : 'Unknown error'}`);
      return;
    }
    addToast('success', `Synced ${res.data.syncedRows} rows from Google Search Console`);

    // Refresh rankings
    const rankRes = await gscApi.rankings(siteId, days, token);
    if (rankRes.success) setData(rankRes.data);
  }

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-sage/40 text-[10px] tracking-wider uppercase">Rank Tracker</span>
          <h1 className="font-heading text-cream mt-0.5 text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
          <p className="text-sage/60 mt-0.5 text-sm">Search performance data from Google Search Console</p>
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
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <div className="bg-clay/15 border-clay/25 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-clay h-6 w-6"
              >
                <rect x="2" y="9" width="3" height="5" rx="0.5" />
                <rect x="6.5" y="5" width="3" height="9" rx="0.5" />
                <rect x="11" y="2" width="3" height="12" rx="0.5" />
              </svg>
            </div>
            <h2 className="font-heading text-cream mb-2 text-lg font-semibold">Connect Google Search Console</h2>
            <p className="text-sage/60 mx-auto mb-5 max-w-md text-sm">
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
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
              ✓ Google Search Console connected! Click "Sync Data" to pull your first dataset.
            </div>
          )}
          {gscStatus === 'error' && (
            <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              Connection failed: {searchParams.get('msg') ?? 'Unknown error'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* GSC status from OAuth callback */}
          {gscStatus === 'connected' && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
              ✓ Google Search Console connected successfully!
            </div>
          )}

          {syncError && (
            <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {syncError}
            </div>
          )}

          {fetchError && (
            <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              {fetchError}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Clicks', value: data?.totalClicks ?? 0 },
              { label: 'Total Impressions', value: data?.totalImpressions ?? 0 },
              { label: 'Top Queries', value: data?.topQueries.length ?? 0 },
              { label: 'Days Tracked', value: data?.positionTrend.length ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <p className="text-sage/40 text-[10px] tracking-wider uppercase">{s.label}</p>
                <p className="font-heading text-cream mt-0.5 text-lg font-semibold">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* No data yet */}
          {data && data.positionTrend.length === 0 && data.topQueries.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
              <p className="text-sage/50 text-sm">No ranking data yet</p>
              <p className="text-sage/30 mt-1 text-xs">Click "Sync Data" to pull your search performance from Google</p>
              <p className="text-sage/20 mt-2 text-[10px] italic">GSC data is typically 2–3 days behind</p>
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

          {/* Honest data source label */}
          <div className="flex items-center gap-2 px-2">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-3.5 w-3.5 text-emerald-400/50"
            >
              <path d="M8 1v14M1 8h14" />
            </svg>
            <p className="text-sage/40 text-[10px] italic">
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
