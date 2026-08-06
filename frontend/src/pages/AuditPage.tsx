import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auditApi, siteApi, Audit, AuditTechnical, Site } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

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
    value >= 80
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/60'
      : value >= 50
        ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/60'
        : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/60';
  return (
    <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${color}`}>
      <span className="font-heading text-xl font-bold">{value}</span>
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
    error: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50',
    info: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:border-sky-800/50',
  }[severity];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <div className="flex items-center gap-3">
          <span className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">{title}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge}`}>
            {count} {count === 1 ? 'issue' : 'issues'}
          </span>
        </div>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-[var(--color-text-tertiary)] h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] px-5 py-4">
          {count === 0 ? <p className="text-[var(--color-text-tertiary)] text-sm italic">{empty ?? 'No issues found.'}</p> : children}
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
      {visible.map((u) => (
        <div key={u} className="flex items-center gap-2 border-b border-[var(--color-border)] py-1 last:border-0">
          <span className="bg-[var(--color-border)] h-1.5 w-1.5 flex-shrink-0 rounded-full" />
          <a
            href={u}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] truncate font-mono text-xs transition-colors"
          >
            {u}
          </a>
        </div>
      ))}
      {urls.length > max && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] mt-1 text-xs transition-colors"
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
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 px-5 py-4">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Audit queued — starting shortly…</p>
      </div>
    );
  }
  if (audit.status === 'running') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800/40 dark:bg-sky-900/20 px-5 py-4">
        <svg className="h-4 w-4 flex-shrink-0 animate-spin text-sky-600 dark:text-sky-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-sky-800 dark:text-sky-300">Crawling in progress…</p>
          <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-400/60">Checking up to 20 pages — this may take up to 2 minutes.</p>
        </div>
      </div>
    );
  }
  if (audit.status === 'failed') {
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
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Audit failed</p>
          {audit.error && <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/70">{audit.error}</p>}
        </div>
      </div>
    );
  }
  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);

  const [site, setSite] = useState<Site | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    if (!siteId) return;
    const res = await auditApi.latest(siteId);
    if (res.success) {
      setAudit(res.data);
      if (res.data.status === 'done' || res.data.status === 'failed') stopPolling();
    }
  }, [siteId, stopPolling]);

  // Load site + latest audit on mount
  useEffect(() => {
    if (!siteId) return;
    siteApi.get(siteId).then((r) => {
      if (r.success) setSite(r.data);
    });
    fetchLatest();
  }, [siteId, fetchLatest]);

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
    if (!siteId) return;
    setLaunchError('');
    setLaunching(true);
    const res = await auditApi.run(siteId);
    setLaunching(false);
    if (!res.success) {
      setLaunchError(res.error);
      addToast('error', `Failed to start audit: ${res.error}`);
      return;
    }
    addToast('success', 'Audit started — crawling in progress…');
    // Optimistically set status to queued while we wait for the first poll
    setAudit((prev) =>
      prev
        ? { ...prev, status: 'queued', results: undefined, error: undefined }
        : { _id: res.data.auditId, siteId: siteId!, status: 'queued', createdAt: new Date().toISOString() },
    );
    pollRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);
  }

  const isActive = audit?.status === 'queued' || audit?.status === 'running';
  const tech = audit?.results?.technical;
  const pages = audit?.results?.pagesCrawled ?? [];
  const auditScore = tech ? score(tech, pages.length) : null;

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Technical Audit</span>
          </div>
          <h1 className="font-heading text-[var(--color-text-primary)] text-xl font-semibold">{site?.domain ?? 'Loading…'}</h1>
          {audit?.completedAt && audit.status === 'done' && (
            <p className="text-[var(--color-text-tertiary)] mt-0.5 text-xs">Last run {new Date(audit.completedAt).toLocaleString()}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {auditScore !== null && <ScoreBadge value={auditScore} />}
          <Button size="sm" onClick={handleRunAudit} loading={launching} disabled={isActive}>
            {isActive ? 'Running…' : audit ? 'Re-run audit' : 'Run audit'}
          </Button>
        </div>
      </div>

      {launchError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {launchError}
        </div>
      )}

      {/* Status banner */}
      {audit && audit.status !== 'done' && (
        <div className="mb-6">
          <StatusBanner audit={audit} />
        </div>
      )}

      {/* No audit yet */}
      {!audit && !isActive && (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-7 w-7">
              <path d="M3 12l2.5-5 2.5 3 2.5-7L13 12" />
            </svg>
          }
          title="No audit run yet"
          description="Run a technical audit to crawl this site and surface SEO issues across up to 20 pages."
        />
      )}

      {/* Results */}
      {audit?.status === 'done' && tech && (
        <div className="space-y-4">
          {/* Summary strip */}
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Pages crawled', value: pages.length },
              { label: 'Total issues', value: countIssues(tech) },
              { label: 'Broken links', value: tech.brokenInternalLinks.length },
              { label: 'Score', value: `${auditScore}/100` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
                <p className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">{s.label}</p>
                <p className="font-heading text-[var(--color-text-primary)] mt-0.5 text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Robots & Sitemap */}
          <IssueSection
            title="Robots & Sitemap"
            count={
              (!tech.robotsTxt.found ? 1 : 0) +
              (!tech.sitemapXml.found ? 1 : 0) +
              (tech.robotsTxt.disallowsEverything ? 1 : 0)
            }
            severity="warning"
          >
            <div className="space-y-2 text-sm">
              <InfoRow label="robots.txt" ok={tech.robotsTxt.found} okText="Found" failText="Not found" />
              {tech.robotsTxt.disallowsEverything && (
                <p className="ml-4 text-xs text-red-600 dark:text-red-400">
                  ⚠ Disallows all crawlers — search engines cannot index this site.
                </p>
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
                  <p className="text-[var(--color-text-primary)] mb-2 text-xs font-semibold">
                    Missing title tags ({tech.missingTitleTags.length})
                  </p>
                  <UrlList urls={tech.missingTitleTags} />
                </div>
              )}
              {tech.missingMetaDescriptions.length > 0 && (
                <div>
                  <p className="text-[var(--color-text-primary)] mb-2 text-xs font-semibold">
                    Missing meta descriptions ({tech.missingMetaDescriptions.length})
                  </p>
                  <UrlList urls={tech.missingMetaDescriptions} />
                </div>
              )}
              {tech.duplicateTitles.length > 0 && (
                <div>
                  <p className="text-[var(--color-text-primary)] mb-2 text-xs font-semibold">
                    Duplicate titles ({tech.duplicateTitles.length} groups)
                  </p>
                  {tech.duplicateTitles.map((dt) => (
                    <div key={dt.title} className="mb-3">
                      <p className="text-[var(--color-text-secondary)] mb-1 text-xs italic">"{dt.title}"</p>
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
                <div key={i} className="flex items-start gap-3 border-b border-[var(--color-border)] py-1.5 last:border-0">
                  <span className="mt-0.5 flex-shrink-0 rounded border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] dark:text-amber-400">
                    {h.issue}
                  </span>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] truncate font-mono text-xs transition-colors"
                  >
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
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-[var(--color-border)] py-1.5 last:border-0"
                >
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] flex-1 truncate font-mono text-xs transition-colors"
                  >
                    {img.url}
                  </a>
                  <span className="text-[var(--color-text-tertiary)] ml-3 flex-shrink-0 text-[10px]">
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
                <div key={i} className="border-b border-[var(--color-border)] py-2 last:border-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex-shrink-0 rounded border border-red-200 bg-red-100 text-red-800 dark:border-red-800/40 dark:bg-red-900/30 px-1.5 py-0.5 text-[10px] dark:text-red-400">
                      {bl.status ?? 'ERR'}
                    </span>
                    <a
                      href={bl.brokenUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-xs text-red-600 hover:text-red-500 dark:text-red-400/80 dark:hover:text-red-300"
                    >
                      {bl.brokenUrl}
                    </a>
                  </div>
                  <p className="text-[var(--color-text-tertiary)] ml-1 text-[10px]">
                    Found on:{' '}
                    <a
                      href={bl.fromUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--color-text-secondary)] font-mono transition-colors"
                    >
                      {bl.fromUrl}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </IssueSection>

          {/* Pages crawled */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="font-heading text-[var(--color-text-primary)] mb-3 text-sm font-semibold">Pages crawled ({pages.length})</p>
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
      <span className="text-[var(--color-text-secondary)] w-24 text-xs">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${ok ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'}`} />
        {ok ? okText : failText}
      </span>
    </div>
  );
}
