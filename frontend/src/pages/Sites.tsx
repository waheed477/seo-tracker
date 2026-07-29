import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { siteApi, workspaceApi, Site, Workspace } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Sites() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [workspace,  setWorkspace]  = useState<Workspace | null>(null);
  const [sites,      setSites]      = useState<Site[]>([]);
  const [fetching,   setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Add-site form
  const [showForm,    setShowForm]    = useState(false);
  const [domain,      setDomain]      = useState('');
  const [adding,      setAdding]      = useState(false);
  const [domainError, setDomainError] = useState('');

  useEffect(() => {
    if (!token || !workspaceId) return;
    Promise.all([
      workspaceApi.list(token),
      siteApi.list(workspaceId, token),
    ]).then(([wsRes, sitesRes]) => {
      setFetching(false);
      if (wsRes.success) {
        const ws = wsRes.data.find(w => w._id === workspaceId);
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
    if (!res.success) { setDomainError(res.error); return; }
    setSites(prev => [res.data, ...prev]);
    setDomain('');
    setShowForm(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl fade-in">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs text-sage/50 hover:text-sage/80 transition-colors mb-5"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <path d="M10 4L6 8l4 4" />
        </svg>
        All workspaces
      </button>

      <div className="flex items-center justify-between mb-7">
        <div>
          <span className="text-[10px] text-sage/40 uppercase tracking-wider">Workspace</span>
          <h1 className="font-heading text-xl font-semibold text-cream mt-0.5">
            {workspace?.name ?? 'Sites'}
          </h1>
          <p className="text-sm text-sage/60 mt-0.5">Manage domains and run audits</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(v => !v); setDomainError(''); }}>
          {showForm ? 'Cancel' : '+ Add site'}
        </Button>
      </div>

      {/* Add-site form */}
      {showForm && (
        <form onSubmit={handleAddSite} className="mb-6 p-5 rounded-xl border border-clay/20 bg-clay/5">
          <h2 className="font-heading text-sm font-semibold text-cream mb-1">Add a site</h2>
          <p className="text-xs text-sage/50 mb-4">
            Enter the bare domain — protocol and trailing slashes are stripped automatically.
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="example.com"
              value={domain}
              onChange={e => setDomain(e.target.value)}
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
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-white/[0.03] shimmer" />)}
        </div>
      ) : fetchError ? (
        <div className="px-4 py-3 rounded-lg bg-red-900/20 border border-red-500/20 text-sm text-red-300">
          {fetchError}
        </div>
      ) : sites.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <p className="text-sage/50 text-sm">No sites yet</p>
          <p className="text-sage/30 text-xs mt-1">Add a domain above to start tracking</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sites.map(site => (
            <div
              key={site._id}
              className="flex items-center justify-between px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-sage/50">
                    <circle cx="8" cy="8" r="6.5" />
                    <ellipse cx="8" cy="8" rx="2.5" ry="6.5" />
                    <line x1="1.5" y1="8" x2="14.5" y2="8" />
                  </svg>
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold text-cream">{site.domain}</p>
                  <p className="text-xs text-sage/40 mt-0.5">
                    Added {new Date(site.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {site.gscConnected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-800/50 text-emerald-400">
                    GSC
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-sage/40">
                    No GSC
                  </span>
                )}
                <button
                  onClick={() => navigate(`/sites/${site._id}/audit`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-clay/15 border border-clay/25 text-clay hover:bg-clay/25 transition-colors font-medium"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                    <path d="M3 12l2.5-5 2.5 3 2.5-7L13 12" />
                  </svg>
                  Audit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
