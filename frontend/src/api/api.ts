// In production, VITE_API_URL is set to the full backend URL (e.g. https://seo-os.hf.space).
// In local dev, it's empty so the Vite dev-server proxy handles /api requests.
// This avoids the "bare /api" mistake that breaks deployed apps.
const BASE = import.meta.env.VITE_API_URL || '/api';

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };
export type ApiResult<T> = ApiSuccess<T> | ApiError;

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const json = await res.json();
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
};

// ── Workspaces ────────────────────────────────────────────────────────────────
export interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  members: { userId: string; role: 'owner' | 'admin' | 'member' }[];
  createdAt: string;
}

export const workspaceApi = {
  create: (name: string, token: string) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, token),
  list: (token: string) => request<Workspace[]>('/workspaces', {}, token),
  addMember: (id: string, email: string, role: string, token: string) =>
    request<Workspace>(
      `/workspaces/${id}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      },
      token,
    ),
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
  create: (workspaceId: string, domain: string, token: string) =>
    request<Site>('/sites', { method: 'POST', body: JSON.stringify({ workspaceId, domain }) }, token),
  list: (workspaceId: string, token: string) =>
    request<Site[]>(`/sites?workspaceId=${encodeURIComponent(workspaceId)}`, {}, token),
  get: (id: string, token: string) => request<Site>(`/sites/${id}`, {}, token),
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
  run: (siteId: string, token: string) =>
    request<{ auditId: string }>(`/sites/${siteId}/audit`, { method: 'POST' }, token),
  latest: (siteId: string, token: string) => request<Audit>(`/sites/${siteId}/audit/latest`, {}, token),
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
  research: (siteId: string, seedKeywords: string[], token: string) =>
    request<Keyword[]>(
      `/sites/${siteId}/keywords`,
      {
        method: 'POST',
        body: JSON.stringify({ seedKeywords }),
      },
      token,
    ),
  clusters: (siteId: string, token: string) =>
    request<KeywordClusters>(`/sites/${siteId}/keywords/clusters`, {}, token),
};

// ── Content Review ────────────────────────────────────────────────────────────
export interface ContentReviewResult {
  overallAssessment: string;
  suggestions: { issue: string; recommendation: string }[];
  estimatedReadability: 'Easy' | 'Moderate' | 'Difficult';
}

export const contentApi = {
  review: (siteId: string, content: string, targetKeywords: string[], token: string, pageUrl?: string) =>
    request<ContentReviewResult>(
      `/sites/${siteId}/content-review`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...(pageUrl ? { pageUrl } : { content }),
          targetKeywords,
        }),
      },
      token,
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
  add: (siteId: string, domain: string, token: string) =>
    request<Competitor>(
      '/competitors',
      {
        method: 'POST',
        body: JSON.stringify({ siteId, domain }),
      },
      token,
    ),
  list: (siteId: string, token: string) =>
    request<Competitor[]>(`/competitors?siteId=${encodeURIComponent(siteId)}`, {}, token),
  analyze: (competitorId: string, token: string) =>
    request<{ reportId: string }>(`/competitors/${competitorId}/analyze`, { method: 'POST' }, token),
  latestReport: (competitorId: string, token: string) =>
    request<ContentGapReport>(`/competitors/${competitorId}/report/latest`, {}, token),
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
  connectUrl: (siteId: string, token: string) =>
    `${BASE}/sites/${siteId}/gsc/connect?token=${encodeURIComponent(token)}`,
  rankings: (siteId: string, days: number, token: string) =>
    request<RankingsData>(`/sites/${siteId}/rankings?days=${days}`, {}, token),
  sync: (siteId: string, token: string, days?: number) =>
    request<{ syncedRows: number }>(
      `/sites/${siteId}/gsc/sync${days ? `?days=${days}` : ''}`,
      { method: 'POST' },
      token,
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
  generate: (siteId: string, token: string) =>
    request<{ planId: string }>(`/sites/${siteId}/action-plan`, { method: 'POST' }, token),
  latest: (siteId: string, token: string) => request<ActionPlan>(`/sites/${siteId}/action-plan/latest`, {}, token),
  updateItem: (siteId: string, itemId: string, status: string, token: string) =>
    request<ActionPlan>(
      `/sites/${siteId}/action-plan/items/${itemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
      token,
    ),
};

// ── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  _id: string;
  workspaceId: string;
  type: 'audit_complete' | 'action_plan_ready' | 'gsc_sync_error' | 'competitor_analysis_complete';
  message: string;
  read: boolean;
  relatedSiteId: string | null;
  createdAt: string;
}

export const notificationApi = {
  list: (workspaceId: string, token: string) =>
    request<Notification[]>(`/notifications?workspaceId=${encodeURIComponent(workspaceId)}`, {}, token),
  markRead: (id: string, token: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }, token),
  markAllRead: (workspaceId: string, token: string) =>
    request<{ updated: true }>(
      '/notifications/read-all',
      {
        method: 'PATCH',
        body: JSON.stringify({ workspaceId }),
      },
      token,
    ),
};
