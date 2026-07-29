import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceApi, Workspace } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Workspaces() {
  const navigate  = useNavigate();
  const { token, user } = useAuthStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [fetching,   setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Create form
  const [showForm,   setShowForm]   = useState(false);
  const [newName,    setNewName]    = useState('');
  const [creating,   setCreating]   = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (!token) return;
    workspaceApi.list(token).then(res => {
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
    if (!res.success) { setCreateError(res.error); return; }
    setWorkspaces(prev => [res.data, ...prev]);
    setNewName('');
    setShowForm(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-heading text-xl font-semibold text-cream">Workspaces</h1>
          <p className="text-sm text-sage/60 mt-0.5">
            {user ? `Signed in as ${user.email}` : 'Your SEO workspaces'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowForm(v => !v); setCreateError(''); }}
        >
          {showForm ? 'Cancel' : '+ New workspace'}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-5 rounded-xl border border-clay/20 bg-clay/5"
        >
          <h2 className="font-heading text-sm font-semibold text-cream mb-4">New workspace</h2>
          {createError && (
            <p className="mb-3 text-xs text-red-400">{createError}</p>
          )}
          <div className="flex gap-3">
            <Input
              placeholder="My Agency · Acme Corp · Personal"
              value={newName}
              onChange={e => setNewName(e.target.value)}
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
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.03] shimmer" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="px-4 py-3 rounded-lg bg-red-900/20 border border-red-500/20 text-sm text-red-300">
          {fetchError}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <p className="text-sage/50 text-sm">No workspaces yet</p>
          <p className="text-sage/30 text-xs mt-1">Create one above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workspaces.map(ws => {
            const myRole = ws.members.find(m => m.userId === user?.id)?.role ?? 'member';
            return (
              <button
                key={ws._id}
                onClick={() => navigate(`/workspaces/${ws._id}/sites`)}
                className="w-full text-left flex items-center justify-between px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-clay/15 border border-clay/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-heading font-bold text-clay text-sm">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-heading text-sm font-semibold text-cream group-hover:text-white transition-colors">
                      {ws.name}
                    </p>
                    <p className="text-xs text-sage/50 mt-0.5">
                      {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-clay/25 text-clay/80 bg-clay/10">
                    {myRole}
                  </span>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="w-4 h-4 text-sage/30 group-hover:text-sage/60 transition-colors">
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
