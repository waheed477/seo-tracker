import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { workspaceApi, siteApi, Workspace, Site } from '../api/api';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!token) return;
    workspaceApi.list(token).then((res) => {
      setFetching(false);
      if (res.success) setWorkspaces(res.data);
      else setFetchError(res.error);
    });
  }, [token]);

  // Load sites for the current workspace (if any)
  useEffect(() => {
    if (!token || !currentWorkspaceId) {
      setSites([]);
      return;
    }
    siteApi.list(currentWorkspaceId, token).then((res) => {
      if (res.success) setSites(res.data);
    });
  }, [token, currentWorkspaceId]);

  if (fetching) {
    return (
      <div className="fade-in p-6 lg:p-8">
        <LoadingSkeleton rows={4} height="h-24" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {fetchError}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-cream text-2xl font-semibold">Command Center</h1>
        <p className="text-sage/70 mt-1 text-sm">
          {user ? `Signed in as ${user.email}` : 'Your SEO overview'}
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sage/50 text-[10px] font-medium tracking-widest uppercase">Workspaces</p>
          <p className="font-heading text-cream mt-2 text-3xl font-bold">{workspaces.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sage/50 text-[10px] font-medium tracking-widest uppercase">Sites Tracked</p>
          <p className="font-heading text-cream mt-2 text-3xl font-bold">{sites.length}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sage/50 text-[10px] font-medium tracking-widest uppercase">GSC Connected</p>
          <p className="font-heading text-cream mt-2 text-3xl font-bold">
            {sites.filter((s) => s.gscConnected).length}
          </p>
        </div>
      </div>

      {/* Workspaces list */}
      {workspaces.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-clay h-7 w-7">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          }
          title="No workspaces yet"
          description="Create your first workspace to start organizing your SEO projects."
          action={{
            label: '+ New workspace',
            onClick: () => navigate('/app'),
          }}
        />
      ) : (
        <div>
          <h2 className="font-heading text-cream mb-4 text-sm font-semibold">Your Workspaces</h2>
          <div className="space-y-2">
            {workspaces.map((ws) => {
              const myRole = ws.members.find((m) => m.userId === user?.id)?.role ?? 'member';
              return (
                <button
                  key={ws._id}
                  onClick={() => navigate(`/app/workspaces/${ws._id}/sites`)}
                  className="group flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-clay/20 bg-clay/15">
                      <span className="font-heading text-clay text-sm font-bold">{ws.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-heading text-cream text-sm font-semibold transition-colors group-hover:text-white">
                        {ws.name}
                      </p>
                      <p className="text-sage/50 mt-0.5 text-xs">{ws.members.length} member{ws.members.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded border border-clay/25 bg-clay/10 px-2 py-0.5 text-[10px] tracking-wider uppercase text-clay/80">
                      {myRole}
                    </span>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-sage/30 transition-colors group-hover:text-sage/60">
                      <path d="M6 4l4 4-4 4" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
