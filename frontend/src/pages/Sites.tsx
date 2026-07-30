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

export default function Sites() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
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

  useEffect(() => {
    if (!token || !workspaceId) return;
    // Store current workspaceId for notification bell
    setCurrentWorkspaceId(workspaceId);
    Promise.all([workspaceApi.list(token), siteApi.list(workspaceId, token)]).then(([wsRes, sitesRes]) => {
      setFetching(false);
      if (wsRes.success) {
        const ws = wsRes.data.find((w) => w._id === workspaceId);
        if (ws) setWorkspace(ws);
      }
      if (sitesRes.success) setSites(sitesRes.data);
      else setFetchError(sitesRes.error);
    });
  }, [token, workspaceId]);

  async function handleAddSite(e: FormEvent) {
    e.preventDefault();
    if (!token || !workspaceId || !domain.trim()) return;
    setDomainError('');
    setAdding(true);
    const res = await siteApi.create(workspaceId, domain.trim(), token);
    setAdding(false);
    if (!res.success) {
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
        className="text-sage/50 hover:text-sage/80 mb-5 flex items-center gap-1.5 text-xs transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        All workspaces
      </button>

      <div className="mb-7 flex items-center justify-between">
        <div>
          <span className="text-sage/40 text-[10px] tracking-wider uppercase">Workspace</span>
          <h1 className="font-heading text-cream mt-0.5 text-xl font-semibold">{workspace?.name ?? 'Sites'}</h1>
          <p className="text-sage/60 mt-0.5 text-sm">Manage domains and run audits</p>
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
        <form onSubmit={handleAddSite} className="border-clay/20 bg-clay/5 mb-6 rounded-xl border p-5">
          <h2 className="font-heading text-cream mb-1 text-sm font-semibold">Add a site</h2>
          <p className="text-sage/50 mb-4 text-xs">
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
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay h-7 w-7">
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
              className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-sage/50 h-4 w-4"
                  >
                    <circle cx="8" cy="8" r="6.5" />
                    <ellipse cx="8" cy="8" rx="2.5" ry="6.5" />
                    <line x1="1.5" y1="8" x2="14.5" y2="8" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-cream text-sm font-semibold">{site.domain}</p>
                  <p className="text-sage/40 mt-0.5 text-xs">Added {new Date(site.createdAt).toLocaleDateString()}</p>
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
          ? 'bg-clay/25 border-clay/40 text-cream hover:bg-clay/35 border font-semibold'
          : 'bg-clay/15 border-clay/25 text-clay hover:bg-clay/25 border'
      }`}
    >
      {label}
    </button>
  );
}
