import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceApi, Workspace } from '../api/api';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

export default function Workspaces() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!token) return;
    workspaceApi.list(token).then((res) => {
      setFetching(false);
      if (res.success) setWorkspaces(res.data);
      else setFetchError(res.error);
    });
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setCreateError('');
    setCreating(true);
    const res = await workspaceApi.create(newName.trim(), token);
    setCreating(false);
    if (!res.success) {
      setCreateError(res.error);
      addToast('error', `Failed to create workspace: ${res.error}`);
      return;
    }
    setWorkspaces((prev) => [res.data, ...prev]);
    setNewName('');
    setShowForm(false);
    addToast('success', `Workspace "${newName.trim()}" created`);
  }

  return (
    <div className="fade-in max-w-3xl p-6 lg:p-8">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-cream text-xl font-semibold">Workspaces</h1>
          <p className="text-sage/60 mt-0.5 text-sm">{user ? `Signed in as ${user.email}` : 'Your SEO workspaces'}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setCreateError('');
          }}
        >
          {showForm ? 'Cancel' : '+ New workspace'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border-clay/20 bg-clay/5 mb-6 rounded-xl border p-5">
          <h2 className="font-heading text-cream mb-4 text-sm font-semibold">New workspace</h2>
          {createError && <p className="mb-3 text-xs text-red-400">{createError}</p>}
          <div className="flex gap-3">
            <Input
              placeholder="My Agency · Acme Corp · Personal"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
              autoFocus
              required
            />
            <Button type="submit" loading={creating} size="sm">
              Create
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {fetching ? (
        <LoadingSkeleton rows={2} height="h-20" />
      ) : fetchError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {fetchError}
        </div>
      ) : workspaces.length === 0 ? (
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
            onClick: () => {
              setShowForm(true);
              setCreateError('');
            },
          }}
        />
      ) : (
        <div className="space-y-2">
          {workspaces.map((ws) => {
            const myRole = ws.members.find((m) => m.userId === user?.id)?.role ?? 'member';
            return (
              <button
                key={ws._id}
                onClick={() => navigate(`/workspaces/${ws._id}/sites`)}
                className="group flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-clay/15 border-clay/20 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border">
                    <span className="font-heading text-clay text-sm font-bold">{ws.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-heading text-cream text-sm font-semibold transition-colors group-hover:text-white">
                      {ws.name}
                    </p>
                    <p className="text-sage/50 mt-0.5 text-xs">
                      {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="border-clay/25 text-clay/80 bg-clay/10 rounded border px-2 py-0.5 text-[10px] tracking-wider uppercase">
                    {myRole}
                  </span>
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-sage/30 group-hover:text-sage/60 h-4 w-4 transition-colors"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
