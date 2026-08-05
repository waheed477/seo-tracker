const fs = require('fs');

const apiPath = 'frontend/src/api/api.ts';
let code = fs.readFileSync(apiPath, 'utf8');

// 1. Remove `token?: string | null` and `, token?: string` and `, token: string` from method signatures
code = code.replace(/,\s*token\??\s*:\s*string\s*\|\s*null/g, '');
code = code.replace(/,\s*token\??\s*:\s*string/g, '');
// For methods where token is the only param, e.g. `list: (token: string) =>`
code = code.replace(/\(token\??\s*:\s*string\)/g, '()');

// 2. Remove `, token` from `request(...)` calls
// We'll just replace `, token)` with `)` and `, token,` with `,` where it matches the old signature.
code = code.replace(/,\s*token\s*\)/g, ')');
code = code.replace(/,\s*token\s*,/g, ',');

// 3. Update the request function itself
const requestFunctionNew = `
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  
  const doFetch = () => fetch(\`\${BASE}\${path}\`, { 
    ...options, 
    headers,
    credentials: 'include' 
  });

  try {
    let res = await doFetch();
    
    if (res.status === 401 && path !== '/auth/refresh') {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = fetch(\`\${BASE}/auth/refresh\`, { method: 'POST', credentials: 'include' })
          .then(r => {
            isRefreshing = false;
            return r.status === 200;
          })
          .catch(() => {
            isRefreshing = false;
            return false;
          });
      }
      
      const refreshSuccess = await refreshPromise;
      if (refreshSuccess) {
        // Retry the original request ONCE
        res = await doFetch();
      } else {
        // Refresh failed (or refresh token expired/revoked) -> clear auth state
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return { success: false, error: 'Session expired' };
      }
    }

    const json = await res.json();
    
    if (!res.ok) {
        return { success: false, error: json.error || 'Request failed' }
    }
    return json as ApiResult<T>;
  } catch {
    return { success: false, error: 'Network error — could not reach the server' };
  }
}
`;

// Replace old request function
const requestFunctionRegex = /async function request<T>[\s\S]*?\}\n/m;
code = code.replace(requestFunctionRegex, requestFunctionNew);

// 4. Add useAuthStore import at the top
if (!code.includes('useAuthStore')) {
  code = `import { useAuthStore } from '../store/authStore';\n` + code;
}

// 5. Add /me and /refresh and /logout endpoints to authApi
const newAuthMethods = `
  me: () => request<AuthPayload>('/auth/me', { method: 'GET' }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  refresh: () => request<AuthPayload>('/auth/refresh', { method: 'POST' }),
`;
code = code.replace(/resetPassword:\s*\([\s\S]*?\},/, match => match + '\n' + newAuthMethods);

// 6. Update connectUrl to not need token, or make it optional but not use it
code = code.replace(
  /connectUrl:\s*\(\s*siteId:\s*string\s*\)\s*=>\s*`\$\{BASE\}\/sites\/\$\{siteId\}\/gsc\/connect\?token=\$\{encodeURIComponent\(token\)\}`/g, 
  "connectUrl: (siteId: string) => `${BASE}/sites/${siteId}/gsc/connect`"
);

// Specifically fix connectUrl in case it was missed
code = code.replace(
  /connectUrl:\s*\([^)]*\)\s*=>\s*`[^`]+`/g,
  "connectUrl: (siteId: string) => `${BASE}/sites/${siteId}/gsc/connect`"
);


fs.writeFileSync(apiPath, code);
console.log('Done refactoring api.ts');
