const base = 'http://localhost:5001/api';

async function main() {
  try {
    const email = `repro.${Date.now()}@example.com`;
    console.log('Registering', email);
    const regResp = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!', name: 'Repro User' }),
    });
    const regJson = await regResp.json();
    console.log('REGISTER_STATUS', regResp.status);
    console.log(JSON.stringify(regJson, null, 2));
    if (!regJson.success) return;

    const token = regJson.data?.token || regJson.token;
    console.log('TOKEN', token?.slice(0, 20) + '...');

    const wsResp = await fetch(`${base}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Repro Workspace' }),
    });
    const wsJson = await wsResp.json();
    console.log('WORKSPACE_STATUS', wsResp.status);
    console.log(JSON.stringify(wsJson, null, 2));
    if (!wsJson.success) return;

    const siteResp = await fetch(`${base}/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ workspaceId: wsJson.data._id, domain: 'repro-site.example.com' }),
    });
    const siteJson = await siteResp.json();
    console.log('SITE_STATUS', siteResp.status);
    console.log(JSON.stringify(siteJson, null, 2));
    if (!siteJson.success) return;

    const siteId = siteJson.data._id;

    const keywordResp = await fetch(`${base}/sites/${siteId}/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ seedKeywords: ['movie download', 'bollywood movies'] }),
    });
    const keywordText = await keywordResp.text();
    console.log('KEYWORD_STATUS', keywordResp.status);
    console.log(keywordText);

    const contentResp = await fetch(`${base}/sites/${siteId}/content-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: 'This is sample content about movie download and bollywood movies.', targetKeywords: ['movie download'] }),
    });
    const contentText = await contentResp.text();
    console.log('CONTENT_STATUS', contentResp.status);
    console.log(contentText);

    const competitorResp = await fetch(`${base}/competitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ siteId, domain: 'hdhub4u.ec' }),
    });
    const competitorText = await competitorResp.text();
    console.log('COMPETITOR_STATUS', competitorResp.status);
    console.log(competitorText);
  } catch (err) {
    console.error('ERROR', err);
  }
}

main();
