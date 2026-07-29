const BASE = '/api';

type ApiSuccess<T> = { success: true; data: T };
type ApiError     = { success: false; error: string };
export type ApiResult<T> = ApiSuccess<T> | ApiError;

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  try {
    const res  = await fetch(`${BASE}${path}`, { ...options, headers });
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
      method: 'POST', body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthPayload>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
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
  list: (token: string) =>
    request<Workspace[]>('/workspaces', {}, token),
  addMember: (id: string, email: string, role: string, token: string) =>
    request<Workspace>(`/workspaces/${id}/members`, {
      method: 'POST', body: JSON.stringify({ email, role }),
    }, token),
};

// ── Sites ─────────────────────────────────────────────────────────────────────
export interface Site {
  _id: string;
  workspaceId: string;
  domain: string;
  gscConnected: boolean;
  createdAt: string;
}

export const siteApi = {
  create: (workspaceId: string, domain: string, token: string) =>
    request<Site>('/sites', { method: 'POST', body: JSON.stringify({ workspaceId, domain }) }, token),
  list: (workspaceId: string, token: string) =>
    request<Site[]>(`/sites?workspaceId=${encodeURIComponent(workspaceId)}`, {}, token),
  get: (id: string, token: string) =>
    request<Site>(`/sites/${id}`, {}, token),
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
  latest: (siteId: string, token: string) =>
    request<Audit>(`/sites/${siteId}/audit/latest`, {}, token),
};
