/**
 * Technical SEO Agent
 *
 * Crawl constraints (architectural, not incidental):
 *  - Max 20 pages per run (hosting resource limit)
 *  - 400 ms polite delay between every HTTP request
 *  - 10 s page-fetch timeout, 5 s HEAD timeout
 *  - Respects robots.txt for User-agent: * and our UA
 *  - Broken-link HEAD checks capped at 50 unique internal links
 *  - Single-process, no external queue — runs fully in-memory
 */

const axios   = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'SEO-OS-Audit/1.0 (Technical SEO auditing tool; https://github.com/your-repo)';
const MAX_PAGES  = 20;
const CRAWL_DELAY_MS  = 400;
const PAGE_TIMEOUT_MS = 10_000;
const HEAD_TIMEOUT_MS = 5_000;
const MAX_LINK_CHECKS = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Resolve and normalise a URL:
 * - Make absolute using baseUrl
 * - Strip hash fragment
 * - Lowercase scheme + host
 * - Returns null if the URL is external, mailto, tel, data, js, etc.
 */
function resolveInternal(href, baseUrl, allowedHosts) {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    trimmed.startsWith('#') ||
    /^(mailto|tel|javascript|data):/i.test(trimmed)
  ) return null;

  try {
    const url = new URL(trimmed, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!allowedHosts.includes(url.hostname)) return null;
    url.hash = '';                         // strip fragment
    url.pathname = url.pathname || '/';    // ensure path exists
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Parse robots.txt text into a checker object.
 * We apply rules for both User-agent: * and our specific UA.
 */
function parseRobotsTxt(text) {
  const disallowPaths = new Set();
  const lines = text.split(/\r?\n/);
  let applicable = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key   = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'user-agent') {
      applicable = value === '*' || value.toLowerCase().includes('seo-os');
    } else if (key === 'disallow' && applicable && value) {
      disallowPaths.add(value);
    }
  }

  const disallowsEverything = disallowPaths.has('/');

  return {
    disallowsEverything,
    isDisallowed(pathname) {
      if (disallowsEverything) return true;
      for (const rule of disallowPaths) {
        if (pathname.startsWith(rule)) return true;
      }
      return false;
    },
  };
}

/**
 * Fetch a URL's sitemap and count <loc> entries (best effort).
 */
async function fetchSitemap(domain) {
  const candidates = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `http://${domain}/sitemap.xml`,
  ];

  for (const url of candidates) {
    try {
      const { data, status } = await axios.get(url, {
        timeout: PAGE_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
        maxContentLength: 5 * 1024 * 1024, // 5 MB cap
      });
      if (status >= 400) continue;
      const $ = cheerio.load(data, { xmlMode: true });
      const urlCount = $('loc').length;
      return { found: true, urlCount };
    } catch {
      // try next candidate
    }
  }
  return { found: false, urlCount: 0 };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run a full technical SEO audit on `domain`.
 * Returns the structured results object matching the Audit model.
 *
 * Designed to be called fire-and-forget from a route handler;
 * the caller is responsible for writing results to MongoDB.
 */
async function run(domain) {
  const normalDomain = domain.replace(/^www\./, '');
  const allowedHosts = [normalDomain, `www.${normalDomain}`];

  // Try https first, fall back to http
  const baseUrl = `https://${normalDomain}`;

  // ── 1. Robots.txt ─────────────────────────────────────────────────────────
  let robotsResult = { found: false, disallowsEverything: false };
  let robots       = { isDisallowed: () => false, disallowsEverything: false };

  try {
    const { data, status } = await axios.get(`${baseUrl}/robots.txt`, {
      timeout: PAGE_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (status < 400 && data) {
      robots       = parseRobotsTxt(String(data));
      robotsResult = { found: true, disallowsEverything: robots.disallowsEverything };
    }
  } catch {
    // 404 / timeout / DNS failure — treat as not found, continue crawl
  }

  await delay(CRAWL_DELAY_MS);

  // ── 2. Crawl pages ────────────────────────────────────────────────────────
  /**
   * linkMap: brokenUrl → [fromUrl, ...] — tracks where each internal link
   * was discovered so we can report which page contained the broken link.
   */
  const visited  = new Set();   // URLs successfully fetched
  const queue    = [`${baseUrl}/`];
  const linkMap  = new Map();   // url → [fromUrls]
  const pageData = [];          // per-page extracted metadata

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const pageUrl = queue.shift();

    // Normalise and dedup
    let normUrl;
    try {
      const u = new URL(pageUrl);
      u.hash = '';
      normUrl = u.href;
    } catch {
      continue;
    }

    if (visited.has(normUrl)) continue;

    // Respect robots.txt
    try {
      const pathname = new URL(normUrl).pathname;
      if (robots.isDisallowed(pathname)) continue;
    } catch {
      continue;
    }

    visited.add(normUrl);

    try {
      const { data, status } = await axios.get(normUrl, {
        timeout: PAGE_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
        maxContentLength: 2 * 1024 * 1024, // 2 MB cap per page
      });

      if (status >= 400) {
        visited.delete(normUrl); // didn't actually succeed
        continue;
      }

      const $ = cheerio.load(data);

      // Extract metadata
      const title       = $('title').first().text().trim();
      const metaDesc    = ($('meta[name="description"]').attr('content') ?? '').trim();
      const h1s         = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
      const imagesNoAlt = $('img').filter((_, el) => {
        const alt = $(el).attr('alt');
        return alt === undefined || alt === null;
      }).length;

      // Extract internal links
      const foundLinks = [];
      $('a[href]').each((_, el) => {
        const resolved = resolveInternal($(el).attr('href'), normUrl, allowedHosts);
        if (!resolved) return;
        foundLinks.push(resolved);

        if (!linkMap.has(resolved)) linkMap.set(resolved, []);
        if (!linkMap.get(resolved).includes(normUrl)) {
          linkMap.get(resolved).push(normUrl);
        }

        // Enqueue if not yet seen
        if (!visited.has(resolved) && !queue.includes(resolved)) {
          queue.push(resolved);
        }
      });

      pageData.push({ url: normUrl, title, metaDesc, h1s, imagesNoAlt });
    } catch (err) {
      // Single-page fetch failure: log and continue — don't abort the audit
      console.warn(`[TechSEO] Failed to fetch ${normUrl}: ${err.message}`);
      visited.delete(normUrl); // don't count it as a successful crawl
    }

    await delay(CRAWL_DELAY_MS);
  }

  // ── 3. Sitemap ────────────────────────────────────────────────────────────
  const sitemapResult = await fetchSitemap(normalDomain);

  // ── 4. Broken-link HEAD checks ────────────────────────────────────────────
  const brokenInternalLinks = [];

  // Only check links we haven't already crawled (visited = known-good pages)
  const linksToCheck = [...linkMap.entries()]
    .filter(([url]) => !visited.has(url))
    .slice(0, MAX_LINK_CHECKS);

  for (const [brokenUrl, fromUrls] of linksToCheck) {
    try {
      const { status } = await axios.head(brokenUrl, {
        timeout: HEAD_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT },
        validateStatus: () => true, // don't throw on 4xx/5xx
        maxRedirects: 5,
      });

      if (status >= 400) {
        brokenInternalLinks.push({ fromUrl: fromUrls[0], brokenUrl, status });
      }
    } catch {
      // Network error / timeout — treat as broken
      brokenInternalLinks.push({ fromUrl: fromUrls[0], brokenUrl, status: null });
    }

    await delay(CRAWL_DELAY_MS);
  }

  // ── 5. Build aggregated results ───────────────────────────────────────────
  const missingTitleTags        = pageData.filter(p => !p.title).map(p => p.url);
  const missingMetaDescriptions = pageData.filter(p => !p.metaDesc).map(p => p.url);

  // Duplicate titles: group pages sharing the same non-empty title
  const titleGroups = {};
  for (const p of pageData) {
    if (!p.title) continue;
    (titleGroups[p.title] = titleGroups[p.title] ?? []).push(p.url);
  }
  const duplicateTitles = Object.entries(titleGroups)
    .filter(([, urls]) => urls.length > 1)
    .map(([title, urls]) => ({ title, urls }));

  const headingIssues = pageData.flatMap(p => {
    const issues = [];
    if (p.h1s.length === 0) issues.push({ url: p.url, issue: 'No H1 tag found' });
    if (p.h1s.length > 1)  issues.push({ url: p.url, issue: `${p.h1s.length} H1 tags (should be one)` });
    return issues;
  });

  const missingAltText = pageData
    .filter(p => p.imagesNoAlt > 0)
    .map(p => ({ url: p.url, imageCount: p.imagesNoAlt }));

  return {
    pagesCrawled: [...visited],
    technical: {
      missingMetaDescriptions,
      missingTitleTags,
      duplicateTitles,
      headingIssues,
      missingAltText,
      robotsTxt: robotsResult,
      sitemapXml: sitemapResult,
      brokenInternalLinks,
    },
  };
}

module.exports = { run };
