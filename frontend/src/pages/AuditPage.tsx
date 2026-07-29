import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auditApi, siteApi, Audit, AuditTechnical, Site } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';

const POLL_INTERVAL_MS = 3000;

// ── Issue-count helpers ───────────────────────────────────────────────────────
function countIssues(t: AuditTechnical): number {
  return (
    t.missingTitleTags.length +
    t.missingMetaDescriptions.length +
    t.duplicateTitles.length +
    t.headingIssues.length +
    t.missingAltText.length +
    t.brokenInternalLinks.length
  );
}

function score(t: AuditTechnical, pageCount: number): number {
  if (pageCount === 0) return 0;
  const issues = countIssues(t);
  return Math.max(0, Math.round(100 - (issues / pageCount) * 20));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreBadge({ value }: { value: number }) {
  const color =
    value >= 80 ? 'text-emerald-400 border-emerald-800/60 bg-emerald-900/30' :
    value >= 50 ? 'text-amber-400 border-amber-800/60 bg-amber-900/30' :
                  'text-red-400 border-red-800/60 bg-red-900/30';
  return (
    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${color}`}>
      <span className="font-heading font-bold text-xl">{value}</span>
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  severity: 'error' | 'warning' | 'info';
  children: React.ReactNode;
  empty?: string;
}

function IssueSection({ title, count, severity, children, empty }: SectionProps) {
  const [open, setOpen] = useState(count > 0);

  const badge = {
    error:   'bg-red-900/40 text-red-400 border-red-800/50',
    warning: 'bg-amber-900/40 text-amber-400 border-amber-800/50',
    info:    'bg-sky-900/40 text-sky-400 border-sky-800/50',
  }[severity];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold text-cream">{title}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge}`}>
            {count} {count === 1 ? 'issue' : 'issues'}
          </span>
        </div>
        <svg
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          className={`w-4 h-4 text-sage/40 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-5 py-4">
          {count === 0
            ? <p className="text-sm text-sage/50 italic">{empty ?? 'No issues found.'}</p>
            : children}
        </div>
      )}
    </div>
  );
}

function UrlList({ urls, max = 10 }: { urls: string[]; max?: number }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? urls : urls.slice(0, max);
  return (
    <div className="space-y-1">
      {visible.map(u => (
        <div key={u} className="flex items-center gap-2 py-1 border-b border-white/[0.04] last:border-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sage/30 flex-shrink-0" />
          <a
            href={u} target="_blank" rel="noreferrer"
            className="text-xs text-sage/70 hover:text-clay transition-colors truncate font-mono"
          >
            {u}
          </a>
        </div>
      ))}
      {urls.length > max && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-clay/70 hover:text-clay transition-colors mt-1"
        >
          + {urls.length - max} more
        </button>
      )}
    </div>
  );
}

// ── Status banner ─────────────────────────────────────────────────────────────
function StatusBanner({ audit }: { audit: Audit }) {
  if (audit.status === 'queued') {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-amber-800/40 bg-amber-900/20">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-sm text-amber-300 font-medium">Audit queued — starting shortly…</p>
      </div>
    );
  }
  if (audit.status === 'running') {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-sky-800/40 bg-sky-900/20">
        <svg className="animate-spin w-4 h-4 text-sky-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div>
          <p className="text-sm text-sky-300 font-medium">Crawling in progress…</p>
          <p className="text-xs text-sky-400/60 mt-0.5">Checking up to 20 pages — this may take up to 2 minutes.</p>
        </div>
      </div>
    );
  }
  if (audit.status === 'failed') {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-red-800/40 bg-red-900/20">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-red-400 flex-shrink-0">
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 5v3.5M8 11h.01" />
        </svg>
        <div>
          <p className="text-sm text-red-300 font-medium">Audit failed</p>
          {audit.error && <p className="text-xs text-red-400/70 mt-0.5">{audit.error}</p>}
        </div>
      </div>
    );
  }
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate   = useNavigate();
  const { token }  = useAuthStore();

  const [site,        setSite]        = useState<Site | null>(null);
  const [audit,       setAudit]       = useState<Audit | null>(null);
  const [launching,   setLaunching]   = useState(false);
  const [launchError, setLaunchError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchLatest = useCallback(async () => {
    if (!token || !siteId) return;
    const res = await auditApi.latest(siteId, token);
    if (res.success) {
      setAudit(res.data);
      if (res.data.status === 'done' || res.data.status === 'failed') stopPolling();
    }
  }, [token, siteId, stopPolling]);

  // Load site + latest audit on mount
  useEffect(() => {
    if (!token || !siteId) return;
    siteApi.get(siteId, token).then(r => { if (r.success) setSite(r.data); });
    fetchLatest();
  }, [token, siteId, fetchLatest]);

  // Start polling when audit is queued or running
  useEffect(() => {
    if (!audit) return;
    if (audit.status === 'queued' || audit.status === 'running') {
      stopPolling();
      pollRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [audit?.status, fetchLatest, stopPolling]);

  async function handleRunAudit() {
    if (!token || !siteId) return;
    setLaunchError('');
    setLaunching(true);
    const res = await auditApi.run(siteId, token);
    setLaunching(false);
    if (!res.success) { setLaunchError(res.error); return; }
    // Optimistically set status to queued while we wait for the first poll
    setAudit(prev => prev
      ? { ...prev, status: 'queued', results: undefined, error: undefined }
      : { _id: res.data.auditId, siteId: siteId!, status: 'queued', createdAt: new Date().toISOString() }
    );
    pollRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);
  }

  const isActive    = audit?.status === 'queued' || audit?.status === 'running';
  const tech        = audit?.results?.technical;
  const pages       = audit?.results?.pagesCrawled ?? [];
  const auditScore  = tech ? score(tech, pages.length) : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-sage/50 hover:text-sage/80 transition-colors mb-5"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        Back to sites
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-sage/40 uppercase tracking-wider">Technical Audit</span>
          </div>
          <h1 className="font-heading text-xl font-semibold text-cream">
            {site?.domain ?? 'Loading…'}
          </h1>
          {audit?.completedAt && audit.status === 'done' && (
            <p className="text-xs text-sage/50 mt-0.5">
              Last run {new Date(audit.completedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {auditScore !== null && <ScoreBadge value={auditScore} />}
          <Button
            size="sm"
            onClick={handleRunAudit}
            loading={launching}
            disabled={isActive}
          >
            {isActive ? 'Running…' : audit ? 'Re-run audit' : 'Run audit'}
          </Button>
        </div>
      </div>

      {launchError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-500/20 text-sm text-red-300">
          {launchError}
        </div>
      )}

      {/* Status banner */}
      {audit && (audit.status !== 'done') && (
        <div className="mb-6"><StatusBanner audit={audit} /></div>
      )}

      {/* No audit yet */}
      {!audit && !isActive && (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
          <p className="text-sage/50 text-sm">No audit run yet</p>
          <p className="text-sage/30 text-xs mt-1">Click "Run audit" to crawl this site and surface technical issues.</p>
        </div>
      )}

      {/* Results */}
      {audit?.status === 'done' && tech && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            {[
              { label: 'Pages crawled', value: pages.length },
              { label: 'Total issues',  value: countIssues(tech) },
              { label: 'Broken links',  value: tech.brokenInternalLinks.length },
              { label: 'Score',         value: `${auditScore}/100` },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] text-sage/40 uppercase tracking-wider">{s.label}</p>
                <p className="font-heading text-lg font-semibold text-cream mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Robots & Sitemap */}
          <IssueSection
            title="Robots & Sitemap"
            count={(!tech.robotsTxt.found ? 1 : 0) + (!tech.sitemapXml.found ? 1 : 0) + (tech.robotsTxt.disallowsEverything ? 1 : 0)}
            severity="warning"
          >
            <div className="space-y-2 text-sm">
              <InfoRow label="robots.txt" ok={tech.robotsTxt.found} okText="Found" failText="Not found" />
              {tech.robotsTxt.disallowsEverything && (
                <p className="text-xs text-red-400 ml-4">⚠ Disallows all crawlers — search engines cannot index this site.</p>
              )}
              <InfoRow
                label="sitemap.xml"
                ok={tech.sitemapXml.found}
                okText={`Found (${tech.sitemapXml.urlCount} URLs)`}
                failText="Not found"
              />
            </div>
          </IssueSection>

          {/* Meta Tags */}
          <IssueSection
            title="Meta Tags"
            count={tech.missingTitleTags.length + tech.missingMetaDescriptions.length + tech.duplicateTitles.length}
            severity="error"
          >
            <div className="space-y-4">
              {tech.missingTitleTags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-cream mb-2">Missing title tags ({tech.missingTitleTags.length})</p>
                  <UrlList urls={tech.missingTitleTags} />
                </div>
              )}
              {tech.missingMetaDescriptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-cream mb-2">Missing meta descriptions ({tech.missingMetaDescriptions.length})</p>
                  <UrlList urls={tech.missingMetaDescriptions} />
                </div>
              )}
              {tech.duplicateTitles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-cream mb-2">Duplicate titles ({tech.duplicateTitles.length} groups)</p>
                  {tech.duplicateTitles.map(dt => (
                    <div key={dt.title} className="mb-3">
                      <p className="text-xs text-sage/60 italic mb-1">"{dt.title}"</p>
                      <UrlList urls={dt.urls} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </IssueSection>

          {/* Headings */}
          <IssueSection title="Heading Structure" count={tech.headingIssues.length} severity="warning">
            <div className="space-y-1">
              {tech.headingIssues.map((h, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800/40 mt-0.5 flex-shrink-0">
                    {h.issue}
                  </span>
                  <a href={h.url} target="_blank" rel="noreferrer"
                    className="text-xs text-sage/70 hover:text-clay transition-colors font-mono truncate">
                    {h.url}
                  </a>
                </div>
              ))}
            </div>
          </IssueSection>

          {/* Images */}
          <IssueSection title="Image Alt Text" count={tech.missingAltText.length} severity="warning">
            <div className="space-y-1">
              {tech.missingAltText.map((img, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <a href={img.url} target="_blank" rel="noreferrer"
                    className="text-xs text-sage/70 hover:text-clay transition-colors font-mono truncate flex-1">
                    {img.url}
                  </a>
                  <span className="text-[10px] text-sage/40 flex-shrink-0 ml-3">
                    {img.imageCount} image{img.imageCount !== 1 ? 's' : ''} missing alt
                  </span>
                </div>
              ))}
            </div>
          </IssueSection>

          {/* Broken links */}
          <IssueSection title="Broken Internal Links" count={tech.brokenInternalLinks.length} severity="error">
            <div className="space-y-1">
              {tech.brokenInternalLinks.map((bl, i) => (
                <div key={i} className="py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/40 flex-shrink-0">
                      {bl.status ?? 'ERR'}
                    </span>
                    <a href={bl.brokenUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-red-400/80 hover:text-red-300 font-mono truncate">
                      {bl.brokenUrl}
                    </a>
                  </div>
                  <p className="text-[10px] text-sage/40 ml-1">
                    Found on:{' '}
                    <a href={bl.fromUrl} target="_blank" rel="noreferrer"
                      className="hover:text-sage/70 transition-colors font-mono">
                      {bl.fromUrl}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </IssueSection>

          {/* Pages crawled */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="font-heading text-sm font-semibold text-cream mb-3">
              Pages crawled ({pages.length})
            </p>
            <UrlList urls={pages} max={15} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-sage/60 w-24">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        {ok ? okText : failText}
      </span>
    </div>
  );
}
