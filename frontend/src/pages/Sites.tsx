import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { siteApi, workspaceApi, Site, Workspace } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useToastStore } from '../store/toastStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import UpgradeModal from '../components/UpgradeModal';

// Free-tier site cap — mirrors backend FREE_TIER_SITE_LIMIT (routes/sites.js).
// Used only as the pre-response fallback for the indicator/modal; the
// authoritative limit is whatever the 403 FREE_TIER_LIMIT_REACHED returns.
const FREE_TIER_SITE_LIMIT = 1;

export default function Sites() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
    const setCurrentWorkspaceId = useWorkspaceStore((s) => s.setCurrentWorkspaceId);
  const addToast = useToastStore((s) => s.addToast);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Add-site form
  const [showForm, setShowForm] = useState(false);
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [domainError, setDomainError] = useState('');

  // Upgrade modal
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; current: number; limit: number }>({
    open: false,
    current: 0,
    limit: FREE_TIER_SITE_LIMIT,
  });

  const isFreePlan = workspace?.plan === 'free';
  const isProPlan = workspace?.plan === 'pro';

  useEffect(() => {
    if (!workspaceId) return;
    // Store current workspaceId for notification bell
    setCurrentWorkspaceId(workspaceId);
    Promise.all([workspaceApi.list(), siteApi.list(workspaceId)]).then(([wsRes, sitesRes]) => {
      setFetching(false);
      if (wsRes.success) {
        const ws = wsRes.data.find((w) => w._id === workspaceId);
        if (ws) setWorkspace(ws);
      }
      if (sitesRes.success) setSites(sitesRes.data);
      else setFetchError(sitesRes.error);
    });
  }, [workspaceId]);

  async function handleAddSite(e: FormEvent) {
    e.preventDefault();
    if (!workspaceId || !domain.trim()) return;
    setDomainError('');
    setAdding(true);
    const res = await siteApi.create(workspaceId, domain.trim());
    setAdding(false);
    if (!res.success) {
      // Check for free tier limit error
      if (res.error === 'FREE_TIER_LIMIT_REACHED') {
        const data = (res as { success: false; error: string; data?: { limit: number; current: number } }).data;
        setUpgradeModal({
          open: true,
          current: data?.current ?? sites.length,
          limit: data?.limit ?? FREE_TIER_SITE_LIMIT,
        });
        setDomain('');
        setShowForm(false);
        return;
      }
      setDomainError(res.error);
      addToast('error', `Failed to add site: ${res.error}`);
      return;
    }
    setSites((prev) => [res.data, ...prev]);
    setDomain('');
    setShowForm(false);
    addToast('success', `Site ${domain.trim()} added successfully`);
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
        All workspaces
      </button>

      <div className="mb-7 flex items-center justify-between">
        <div>
          <span className="text-[var(--color-text-tertiary)] text-[10px] tracking-wider uppercase">Workspace</span>
          <h1 className="font-heading text-[var(--color-text-primary)] mt-0.5 text-xl font-semibold">{workspace?.name ?? 'Sites'}</h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-[var(--color-text-secondary)] text-sm">Manage domains and run audits</p>
            {/* Plan indicator */}
            {isProPlan ? (
              <span className="rounded-full border border-emerald-800/50 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                PRO
              </span>
            ) : isFreePlan ? (
              <span className="text-[var(--color-text-tertiary)] text-xs">
                Sites used: <span className="text-[var(--color-text-primary)] font-medium">{sites.length}</span> / {FREE_TIER_SITE_LIMIT}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setDomainError('');
          }}
        >
          {showForm ? 'Cancel' : '+ Add site'}
        </Button>
      </div>

      {/* Add-site form */}
      {showForm && (
        <form onSubmit={handleAddSite} className="border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 mb-6 rounded-xl border p-5">
          <h2 className="font-heading text-[var(--color-text-primary)] mb-1 text-sm font-semibold">Add a site</h2>
          <p className="text-[var(--color-text-tertiary)] mb-4 text-xs">
            Enter the bare domain — protocol and trailing slashes are stripped automatically.
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              error={domainError}
              className="flex-1"
              autoFocus
              required
            />
            <Button type="submit" loading={adding} size="sm" className="self-start">
              Add
            </Button>
          </div>
        </form>
      )}

      {/* Sites list */}
      {fetching ? (
        <LoadingSkeleton rows={3} height="h-20" />
      ) : fetchError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {fetchError}
        </div>
      ) : sites.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)] h-7 w-7">
              <circle cx="8" cy="8" r="6.5" />
              <ellipse cx="8" cy="8" rx="2.5" ry="6.5" />
              <line x1="1.5" y1="8" x2="14.5" y2="8" />
            </svg>
          }
          title="No sites yet"
          description="Add a domain above to start tracking and running SEO audits."
          action={{
            label: '+ Add site',
            onClick: () => {
              setShowForm(true);
              setDomainError('');
            },
          }}
        />
      ) : (
        <div className="space-y-2">
          {sites.map((site) => (
            <div
              key={site._id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:bg-[var(--color-surface-hover)] sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[var(--color-text-tertiary)] h-4 w-4"
                  >
                    <circle cx="8" cy="8" r="6.5" />
                    <ellipse cx="8" cy="8" rx="2.5" ry="6.5" />
                    <line x1="1.5" y1="8" x2="14.5" y2="8" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-[var(--color-text-primary)] text-sm font-semibold">{site.domain}</p>
                  <p className="text-[var(--color-text-tertiary)] mt-0.5 text-xs">Added {new Date(site.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {site.gscConnected ? (
                  <span className="rounded-full border border-emerald-800/50 bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400">
                    GSC
                  </span>
                ) : null}
                <SiteNavButton siteId={site._id} path="audit" label="Audit" />
                <SiteNavButton siteId={site._id} path="keywords" label="Keywords" />
                <SiteNavButton siteId={site._id} path="content" label="Content" />
                <SiteNavButton siteId={site._id} path="competitors" label="Competitors" />
                <SiteNavButton siteId={site._id} path="rankings" label="Rankings" />
                <SiteNavButton siteId={site._id} path="action-plan" label="Action Plan" primary />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade modal */}
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        workspaceId={workspaceId ?? ''}
        currentCount={upgradeModal.current}
        limit={upgradeModal.limit}
      />
    </div>
  );
}

function SiteNavButton({
  siteId,
  path,
  label,
  primary = false,
}: {
  siteId: string;
  path: string;
  label: string;
  primary?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/app/sites/${siteId}/${path}`)}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        primary
          ? 'bg-[var(--color-accent)]/25 border-[var(--color-accent)]/40 text-[var(--color-text-primary)] hover:bg-[var(--color-accent)]/35 border font-semibold'
          : 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/25 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 border'
      }`}
    >
      {label}
    </button>
  );
}
