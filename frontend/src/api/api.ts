import { useAuthStore } from '../store/authStore';
// In production, VITE_API_URL is set to the full backend URL (e.g. https://seo-os.hf.space).
// In local dev, it's empty so the Vite dev-server proxy handles /api requests.
// This avoids the "bare /api" mistake that breaks deployed apps.
const BASE = import.meta.env.VITE_API_URL || '/api';

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };
export type ApiResult<T> = ApiSuccess<T> | ApiError;


let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  // Always include the in-memory token as Authorization header if available.
  // This works even when the Vite dev proxy doesn't forward httpOnly cookies.
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const doFetch = () => fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  try {
    let res = await doFetch();

    // On 401, attempt a silent token refresh (but never if this IS the refresh call).
    if (res.status === 401 && path !== '/auth/refresh') {
      // Deduplicate concurrent refresh attempts.
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
          .then(async (r) => {
            if (r.status === 200) {
              const body = await r.json();
              // Store the new token + user in Zustand so the Authorization header
              // is correct on the immediately-following retry.
              if (body?.data?.token && body?.data?.user) {
                useAuthStore.getState().setAuth(body.data.user, body.data.token);
              }
              return true;
            }
            return false;
          })
          .catch(() => false)
          .finally(() => {
            isRefreshing = false;
            // Reset so the next genuine 401 creates a fresh refresh promise.
            refreshPromise = null;
          });
      }

      const refreshSuccess = await (refreshPromise ?? Promise.resolve(false));
      if (refreshSuccess) {
        // Re-read the (possibly updated) token after refresh.
        const newToken = useAuthStore.getState().token;
        if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
        res = await doFetch();
      } else {
        // Both access token AND refresh token are invalid → log out.
        // Clear Zustand state only; let React Router (ProtectedRoute) do the redirect.
        useAuthStore.getState().clearAuth();
        return { success: false, error: 'Session expired' };
      }
    }

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error || 'Request failed' };
    }
    return json as ApiResult<T>;
  } catch {
    return { success: false, error: 'Network error — could not reach the server' };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthPayload {
  token: string;
  user: { id: string; email: string; name: string };
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    request<AuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<AuthPayload>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  me: () => request<AuthPayload>('/auth/me', { method: 'GET' }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  refresh: () => request<AuthPayload>('/auth/refresh', { method: 'POST' }),
};

// ── Workspaces ────────────────────────────────────────────────────────────────
export interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  members: { userId: string; role: 'owner' | 'admin' | 'member' }[];
  plan: 'free' | 'pro';
  planStatus: 'active' | 'past_due' | 'canceled';
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: string;
}

export const workspaceApi = {
  create: (name: string) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
  list: () => request<Workspace[]>('/workspaces', {}),
  addMember: (id: string, email: string, role: string) =>
    request<Workspace>(
      `/workspaces/${id}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }
    ),
  createCheckout: (id: string) =>
    request<{ url: string }>(`/workspaces/${id}/create-checkout-session`, { method: 'POST' }),
  createPortal: (id: string) =>
    request<{ url: string }>(`/workspaces/${id}/create-portal-session`, { method: 'POST' }),
};

// ── Sites ─────────────────────────────────────────────────────────────────────
export interface Site {
  _id: string;
  workspaceId: string;
  domain: string;
  gscConnected: boolean;
  gscSiteUrl?: string;
  createdAt: string;
}

export const siteApi = {
  create: (workspaceId: string, domain: string) =>
    request<Site>('/sites', { method: 'POST', body: JSON.stringify({ workspaceId, domain }) }),
  list: (workspaceId: string) =>
    request<Site[]>(`/sites?workspaceId=${encodeURIComponent(workspaceId)}`, {}),
  get: (id: string) => request<Site>(`/sites/${id}`, {}),
};

// ── Audits ────────────────────────────────────────────────────────────────────
export interface AuditTechnical {
  missingMetaDescriptions: string[];
  missingTitleTags: string[];
  duplicateTitles: { title: string; urls: string[] }[];
  headingIssues: { url: string; issue: string }[];
  missingAltText: { url: string; imageCount: number }[];
  robotsTxt: { found: boolean; disallowsEverything: boolean };
  sitemapXml: { found: boolean; urlCount: number };
  brokenInternalLinks: { fromUrl: string; brokenUrl: string; status: number | null }[];
}

export interface Audit {
  _id: string;
  siteId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  results?: {
    pagesCrawled: string[];
    technical: AuditTechnical;
  };
  createdAt: string;
}

export const auditApi = {
  run: (siteId: string) =>
    request<{ auditId: string }>(`/sites/${siteId}/audit`, { method: 'POST' }),
  latest: (siteId: string) => request<Audit>(`/sites/${siteId}/audit/latest`, {}),
};

// ── Keywords ──────────────────────────────────────────────────────────────────
export interface Keyword {
  _id: string;
  siteId: string;
  keyword: string;
  cluster: string;
  intent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  difficultyEstimate: number;
  createdAt: string;
}

export interface KeywordClusters {
  [clusterName: string]: Keyword[];
}

export const keywordApi = {
  research: (siteId: string, seedKeywords: string[]) =>
    request<Keyword[]>(
      `/sites/${siteId}/keywords`,
      {
        method: 'POST',
        body: JSON.stringify({ seedKeywords }),
      },
    ),
  clusters: (siteId: string) =>
    request<KeywordClusters>(`/sites/${siteId}/keywords/clusters`, {}),
};

// ── Content Review ────────────────────────────────────────────────────────────
export interface ContentReviewResult {
  overallAssessment: string;
  suggestions: { issue: string; recommendation: string }[];
  estimatedReadability: 'Easy' | 'Moderate' | 'Difficult';
}

export const contentApi = {
  review: (siteId: string, content: string, targetKeywords: string[], pageUrl?: string) =>
    request<ContentReviewResult>(
      `/sites/${siteId}/content-review`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...(pageUrl ? { pageUrl } : { content }),
          targetKeywords,
        }),
      },
    ),
};

// ── Competitors ───────────────────────────────────────────────────────────────
export interface Competitor {
  _id: string;
  workspaceId: string;
  siteId: string;
  domain: string;
  lastCrawledAt?: string;
  createdAt: string;
}

export interface ContentGap {
  topic: string;
  competitorHasIt: boolean;
  userHasIt: boolean;
  opportunity: string;
}

export interface ContentGapReport {
  _id: string;
  siteId: string;
  competitorId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  gaps?: ContentGap[];
  generatedAt?: string;
  createdAt: string;
}

export const competitorApi = {
  add: (siteId: string, domain: string) =>
    request<Competitor>(
      '/competitors',
      {
        method: 'POST',
        body: JSON.stringify({ siteId, domain }),
      },
    ),
  list: (siteId: string) =>
    request<Competitor[]>(`/competitors?siteId=${encodeURIComponent(siteId)}`, {}),
  analyze: (competitorId: string) =>
    request<{ reportId: string }>(`/competitors/${competitorId}/analyze`, { method: 'POST' }),
  latestReport: (competitorId: string) =>
    request<ContentGapReport>(`/competitors/${competitorId}/report/latest`, {}),
};

// ── GSC / Rankings ────────────────────────────────────────────────────────────
export interface PositionTrendPoint {
  date: string;
  avgPosition: number;
  clicks: number;
  impressions: number;
}

export interface TopQuery {
  queryText: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
  ctr: number;
}

export interface RankingsData {
  positionTrend: PositionTrendPoint[];
  topQueries: TopQuery[];
  totalClicks: number;
  totalImpressions: number;
}

export const gscApi = {
  /** Build the OAuth connect URL (browser redirect, not a fetch) */
  connectUrl: (siteId: string) => `${BASE}/sites/${siteId}/gsc/connect`,
  rankings: (siteId: string, days: number) =>
    request<RankingsData>(`/sites/${siteId}/rankings?days=${days}`, {}),
  sync: (siteId: string, days?: number) =>
    request<{ syncedRows: number }>(
      `/sites/${siteId}/gsc/sync${days ? `?days=${days}` : ''}`,
      { method: 'POST' },
    ),
};

// ── Action Plan ───────────────────────────────────────────────────────────────
export interface ActionItem {
  _id: string;
  priority: 'high' | 'medium' | 'low';
  agent: 'technical' | 'content' | 'competitor' | 'rankings' | 'keywords';
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
}

export interface ActionPlan {
  _id: string;
  siteId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  items?: ActionItem[];
  summary?: string;
  generatedAt?: string;
  createdAt: string;
}

export const actionPlanApi = {
  generate: (siteId: string) =>
    request<{ planId: string }>(`/sites/${siteId}/action-plan`, { method: 'POST' }),
  latest: (siteId: string) => request<ActionPlan>(`/sites/${siteId}/action-plan/latest`, {}),
  updateItem: (siteId: string, itemId: string, status: string) =>
    request<ActionPlan>(
      `/sites/${siteId}/action-plan/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    ),
};

// ── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  _id: string;
  workspaceId: string;
  type: 'audit_complete' | 'action_plan_ready' | 'gsc_sync_error' | 'competitor_analysis_complete' | 'plan_upgraded' | 'plan_downgraded' | 'payment_failed';
  message: string;
  read: boolean;
  relatedSiteId: string | null;
  createdAt: string;
}

export const notificationApi = {
  list: (workspaceId: string) =>
    request<Notification[]>(`/notifications?workspaceId=${encodeURIComponent(workspaceId)}`, {}),
  markRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: (workspaceId: string) =>
    request<{ updated: true }>(
      '/notifications/read-all',
      {
        method: 'PATCH',
        body: JSON.stringify({ workspaceId }),
      },
    ),
};
