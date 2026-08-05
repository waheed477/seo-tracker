import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi, Notification } from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useWorkspaceStore } from '../../store/workspaceStore';

const TYPE_ICONS: Record<string, string> = {
  audit_complete: '🔍',
  action_plan_ready: '📋',
  gsc_sync_error: '⚠️',
  competitor_analysis_complete: '⚡',
};

const TYPE_LINKS: Record<string, string> = {
  audit_complete: 'audit',
  action_plan_ready: 'action-plan',
  gsc_sync_error: 'rankings',
  competitor_analysis_complete: 'competitors',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications periodically
  useEffect(() => {
    if (!currentWorkspaceId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [currentWorkspaceId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchNotifications() {
    if (!currentWorkspaceId) return;
    setLoading(true);
    const res = await notificationApi.list(currentWorkspaceId);
    setLoading(false);
    if (res.success) {
      setNotifications(res.data);
    }
  }

  async function handleMarkRead(n: Notification) {
    if (n.read) return;
    await notificationApi.markRead(n._id);
    setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
  }

  async function handleMarkAllRead() {
    if (!currentWorkspaceId) return;
    const res = await notificationApi.markAllRead(currentWorkspaceId);
    if (res.success) {
      setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
      addToast('success', 'All notifications marked as read');
    }
  }

  function handleClick(n: Notification) {
    handleMarkRead(n);
    if (n.relatedSiteId) {
      const linkSuffix = TYPE_LINKS[n.type] || '';
      navigate(`/app/sites/${n.relatedSiteId}/${linkSuffix}`);
    }
    setOpen(false);
  }

  // We need workspaceId to fetch — but we might not have it on first load.
  // If no notifications yet, try to derive workspaceId from the URL path.
  // Simplest approach: require the user to be on a workspace page.
  // Better: store current workspaceId in auth store.
  // For now, we'll just not show the bell until we have a workspaceId.

  if (!currentWorkspaceId) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        title="Notifications"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path d="M4 6a4 4 0 018 0v2l1 2H3l1-2V6z" />
          <path d="M7 13h2" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-[var(--color-accent-text)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-10 right-0 z-50 w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="font-heading text-sm font-semibold text-[var(--color-text-primary)]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--color-text-tertiary)]">No notifications yet</p>
                <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                  You'll be notified when audits, analyses, or plans complete.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className={`w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)] ${n.read ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex-shrink-0 text-sm">{TYPE_ICONS[n.type] || '📌'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[var(--color-text-secondary)] text-sm leading-snug">{n.message}</p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--color-accent)]" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
