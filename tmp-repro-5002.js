const base = 'http://localhost:5002/api';

async function call(path, opts = {}) {
  const url = base + path;
  const res = await fetch(url, opts);
  const body = await res.text();
  console.log('REQUEST', opts.method || 'GET', url);
  console.log('STATUS', res.status);
  console.log(body);
  console.log('---');
  return { res, body };
}

async function main() {
  try {
    const email = `repro.${Date.now()}@example.com`;
    const reg = await call('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!', name: 'Repro User' }),
    });
    const regJson = JSON.parse(reg.body);
    const token = regJson.data?.token;
    const auth = { Authorization: `Bearer ${token}` };

    const ws = await call('/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ name: 'Repro Workspace' }),
    });
    const wsJson = JSON.parse(ws.body);

    const site = await call('/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ workspaceId: wsJson.data._id, domain: 'repro-site.example.com' }),
    });
    const siteJson = JSON.parse(site.body);
    const siteId = siteJson.data._id;

    await call(`/sites/${siteId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ seedKeywords: ['movie download', 'bollywood movies'] }),
    });

    await call(`/sites/${siteId}/content-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ content: 'This is sample content about movie download and bollywood movies.', targetKeywords: ['movie download'] }),
    });

    await call('/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ siteId, domain: 'hdhub4u.ec' }),
    });
  } catch (err) {
    console.error('REPRO ERROR', err);
    process.exit(1);
  }
}

main();
