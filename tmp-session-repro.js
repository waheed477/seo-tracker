/**
 * Session-persistence repro using a real cookie jar (tough-cookie) that
 * enforces Path / Domain / SameSite scoping the way a browser does —
 * unlike supertest, which sends whatever cookie string you hand it.
 *
 * Run: node tmp-session-repro.js  (server must be running on :5001)
 * Delete when done.
 */
const { CookieJar } = require('tough-cookie');

const ORIGIN = 'http://localhost:5001';
const jar = new CookieJar();

async function jarFetch(path, opts = {}) {
  const url = ORIGIN + path;
  const cookieHeader = await jar.getCookieString(url);
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookieHeader) headers['Cookie'] = cookieHeader;
  const res = await fetch(url, { ...opts, headers, redirect: 'manual' });
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const sc of setCookies) {
    try { await jar.setCookie(sc, url); } catch (e) { /* browser would reject too */ }
  }
  return res;
}

(async () => {
  const email = `repro_${Date.now()}@example.com`;

  // 1. Register (sets accessToken + refreshToken cookies)
  let r = await jarFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password123', name: 'Repro' }),
  });
  console.log('register:', r.status);
  console.log('jar after register:', (await jar.getCookieString(ORIGIN + '/api/auth/me')) || '(none for /me)');
  console.log('jar for refresh path:', (await jar.getCookieString(ORIGIN + '/api/auth/refresh')) || '(none for /refresh)');

  // 2. Simulate page-refresh within 15 min: only cookies, no Bearer.
  r = await jarFetch('/api/auth/me', { method: 'GET' });
  console.log('me (fresh, has accessToken cookie):', r.status);

  // 3. Simulate browser-reopen after accessToken expired:
  //    remove the accessToken cookie from the jar, keep refreshToken.
  await jar.removeAllCookies();
  // Re-add ONLY the refreshToken by re-registering? No — instead, log in fresh and
  // then surgically drop accessToken to emulate expiry.
  r = await jarFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'password123' }),
  });
  console.log('login:', r.status);

  // Drop the accessToken cookie only (emulate 15-min expiry).
  const store = jar.store;
  await new Promise((resolve) => {
    store.findCookies('localhost', '/', false, (err, cookies) => {
      const drops = cookies.filter((c) => c.key === 'accessToken');
      let n = drops.length;
      if (n === 0) return resolve();
      drops.forEach((c) => store.removeCookie('localhost', c.path, 'accessToken', () => { if (--n === 0) resolve(); }));
    });
  });
  console.log('cookies visible to /me after dropping accessToken:', (await jar.getCookieString(ORIGIN + '/api/auth/me')) || '(NONE)');
  console.log('cookies visible to /refresh after dropping accessToken:', (await jar.getCookieString(ORIGIN + '/api/auth/refresh')) || '(NONE)');

  // 4. me() should 401 (no access token), then refresh should succeed.
  r = await jarFetch('/api/auth/me', { method: 'GET' });
  console.log('me (reopen, expired access):', r.status, '<-- expect 401');

  r = await jarFetch('/api/auth/refresh', { method: 'POST' });
  console.log('refresh (reopen):', r.status, '<-- expect 200 for session to survive');
  if (r.status === 200) {
    r = await jarFetch('/api/auth/me', { method: 'GET' });
    console.log('me (after refresh):', r.status, '<-- expect 200');
  }

  process.exit(0);
})().catch((e) => { console.error('REPRO ERROR:', e); process.exit(1); });
