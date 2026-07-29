/**
 * Competitor Agent
 *
 * Crawls a competitor's public pages and runs content gap analysis via Groq.
 *
 * What it does:
 *  1. crawlCompetitor(domain) — BFS-crawls up to 20 pages on a competitor domain
 *     (same legitimate method as auditing the user's own site — HTTP fetch of
 *     publicly accessible pages, same robots.txt respect, same politeness delay)
 *  2. analyzeGaps(userPages, compPages, userDomain, compDomain) — Sends both
 *     sites' content summaries to Groq for gap analysis, identifying topics
 *     the competitor covers that the user doesn't
 *
 * NOT scraping any search engine or protected platform.
 *
 * @module services/agents/competitorAgent
 */

const axios = require('axios');
const cheerio = require('cheerio');

const USER_AGENT = 'SEO-OS-Audit/1.0 (Technical SEO auditing tool; https://github.com/your-repo)';
const MAX_PAGES = 20;
const CRAWL_DELAY_MS = 400;
const PAGE_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 500; // truncate per-page excerpt sent to Groq

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Parse robots.txt text — same logic as technicalSeoAgent.
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
    const key = line.slice(0, colonIdx).trim().toLowerCase();
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
 * Resolve an internal URL — same logic as technicalSeoAgent.
 */
function resolveInternal(href, baseUrl, allowedHosts) {
  if (!href) return null;
  const trimmed = href.trim();
  if (trimmed.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (!allowedHosts.includes(url.hostname)) return null;
    url.hash = '';
    url.pathname = url.pathname || '/';
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Crawl a competitor domain and extract per-page content summaries.
 * Returns an array of { url, title, headings, excerpt } objects.
 *
 * Reuses the same crawl pattern from technicalSeoAgent:
 *  - Max 20 pages, 400ms delay, robots.txt respect, transparent UA
 */
async function crawlCompetitor(domain) {
  const normalDomain = domain.replace(/^www\./, '');
  const allowedHosts = [normalDomain, `www.${normalDomain}`];
  const baseUrl = `https://${normalDomain}`;

  // ── 1. robots.txt ────────────────────────────────────────────────────
  let robots = { isDisallowed: () => false, disallowsEverything: false };
  try {
    const { data, status } = await axios.get(`${baseUrl}/robots.txt`, {
      timeout: PAGE_TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (status < 400 && data) {
      robots = parseRobotsTxt(String(data));
      if (robots.disallowsEverything) {
        return { pages: [], blocked: true, reason: 'robots.txt disallows all crawling' };
      }
    }
  } catch {
    /* not found — continue */
  }

  await delay(CRAWL_DELAY_MS);

  // ── 2. Crawl pages ───────────────────────────────────────────────────
  const visited = new Set();
  const queue = [`${baseUrl}/`];
  const pages = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const pageUrl = queue.shift();
    let normUrl;
    try {
      const u = new URL(pageUrl);
      u.hash = '';
      normUrl = u.href;
    } catch {
      continue;
    }

    if (visited.has(normUrl)) continue;

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
        maxContentLength: 2 * 1024 * 1024,
      });

      if (status >= 400) {
        visited.delete(normUrl);
        continue;
      }

      const $ = cheerio.load(data);

      // Title
      const title = $('title').first().text().trim();

      // Headings h1–h3
      const headings = $('h1, h2, h3')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean);

      // Text excerpt (truncated for Groq)
      const fullText = $('main, article, .content, #content, .post, .entry, body')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      const excerpt = fullText.slice(0, MAX_TEXT_CHARS);

      // Internal links for further crawling
      $('a[href]').each((_, el) => {
        const resolved = resolveInternal($(el).attr('href'), normUrl, allowedHosts);
        if (!resolved) return;
        if (!visited.has(resolved) && !queue.includes(resolved)) {
          queue.push(resolved);
        }
      });

      pages.push({ url: normUrl, title, headings, excerpt });
    } catch (err) {
      console.warn(`[CompetitorAgent] Failed to fetch ${normUrl}: ${err.message}`);
      visited.delete(normUrl);
    }

    await delay(CRAWL_DELAY_MS);
  }

  return { pages, blocked: false };
}

/**
 * Run content gap analysis between the user's site and a competitor.
 *
 * @param {object[]} userPages     - { url, title, headings, excerpt }[] from user's site
 * @param {object[]} compPages     - { url, title, headings, excerpt }[] from competitor
 * @param {string}   userDomain    - User's site domain
 * @param {string}   compDomain    - Competitor's domain
 * @returns {Promise<{topic, competitorHasIt, userHasIt, opportunity}[]>}
 */
async function analyzeGaps(userPages, compPages, userDomain, compDomain) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  // Build concise summaries for Groq — we don't send full HTML
  const userTopics = userPages.map((p) => ({
    url: p.url,
    title: p.title || 'Untitled',
    headings: p.headings.slice(0, 8),
    excerpt: p.excerpt.slice(0, 300),
  }));

  const compTopics = compPages.map((p) => ({
    url: p.url,
    title: p.title || 'Untitled',
    headings: p.headings.slice(0, 8),
    excerpt: p.excerpt.slice(0, 300),
  }));

  const systemPrompt = `You are an expert SEO content gap analyst. You compare two websites and identify genuine content opportunities — topics the competitor covers that the user doesn't, with reasoning about why the gap matters.

CRITICAL RULES:
1. You MUST return ONLY valid JSON — no markdown, no explanation, no code fences.
2. The output must be a JSON object with key "gaps" containing an array.
3. Each gap must have: topic (string), competitorHasIt (boolean), userHasIt (boolean), opportunity (string — your reasoning about why this content gap matters and what the user should do about it).
4. Focus on GENUINE opportunities — not just listing every difference. A gap matters if the competitor's content on that topic could attract traffic or customers that the user is missing.
5. Be specific — don't say "write about X" — say "competitor covers [specific topic] which targets [specific audience/intent], and creating content on this could capture [specific benefit]."
6. Include at most 10 gaps. Quality over quantity.`;

  const userPrompt = `Compare these two websites and identify content gaps.

USER'S SITE (${userDomain}):
${JSON.stringify(userTopics, null, 2)}

COMPETITOR'S SITE (${compDomain}):
${JSON.stringify(compTopics, null, 2)}

Identify genuine content opportunities: topics the competitor covers that the user doesn't, with reasoning about why each gap matters. Return ONLY a valid JSON object with key "gaps" — an array of { topic, competitorHasIt, userHasIt, opportunity }. No other text.`;

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60_000,
    },
  );

  const raw = response.data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty response from Groq');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  const gaps = parsed.gaps ?? parsed.results ?? [];
  if (!Array.isArray(gaps)) throw new Error('No gaps array in Groq response');

  // Validate and normalise
  const cleaned = gaps
    .filter((g) => g.topic)
    .map((g) => ({
      topic: String(g.topic).trim(),
      competitorHasIt: Boolean(g.competitorHasIt),
      userHasIt: Boolean(g.userHasIt),
      opportunity: String(g.opportunity ?? '').trim() || 'No reasoning provided',
    }))
    .slice(0, 10);

  if (cleaned.length === 0) {
    cleaned.push({
      topic: 'General content coverage',
      competitorHasIt: true,
      userHasIt: false,
      opportunity:
        "The competitor appears to cover more topics. Consider expanding your content strategy based on the competitor's topic areas.",
    });
  }

  return cleaned;
}

module.exports = { crawlCompetitor, analyzeGaps };
