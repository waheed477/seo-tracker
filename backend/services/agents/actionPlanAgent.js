/**
 * Action Plan Agent — Synthesis Layer
 *
 * Gathers condensed summaries from every previous phase and sends
 * them to Groq (llama-3.3-70b-versatile) to produce a prioritized,
 * actionable SEO improvement plan. This is the key differentiating
 * feature of the whole product.
 *
 * What it does:
 *  1. gatherAuditSummary(siteId) — Issue counts from the latest technical audit
 *  2. gatherCompetitorSummary(siteId) — Top 5 gaps from recent competitor reports
 *  3. gatherRankingsSummary(siteId) — Position trend + top queries from GSC data
 *  4. gatherKeywordSummary(siteId) — Cluster names, counts, avg difficulty
 *  5. Sends all data to Groq as a single structured prompt
 *  6. Returns 8–15 prioritized, data-specific action items
 *
 * Uses the async job pattern (fire-and-forget) because it involves
 * multiple data sources + a larger Groq prompt.
 *
 * @module services/agents/actionPlanAgent
 */

const axios = require('axios');
const Audit = require('../../models/Audit');
const ContentGapReport = require('../../models/ContentGapReport');
const RankSnapshot = require('../../models/RankSnapshot');
const Keyword = require('../../models/Keyword');
const Competitor = require('../../models/Competitor');
const ActionPlan = require('../../models/ActionPlan');
const Site = require('../../models/Site');
const { createNotification } = require('../../lib/notify');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Data gathering helpers ────────────────────────────────────────────────────

/**
 * Gather a condensed summary of the latest audit for a site.
 * Returns issue counts, not full URL lists — token limits matter.
 */
async function gatherAuditSummary(siteId) {
  const audit = await Audit.findOne({ siteId, status: 'done' }).sort({ createdAt: -1 });
  if (!audit || !audit.results?.technical) return null;

  const t = audit.results.technical;
  return {
    pagesCrawled: audit.results.pagesCrawled.length,
    missingTitleTags: t.missingTitleTags.length,
    missingMetaDescriptions: t.missingMetaDescriptions.length,
    duplicateTitles: t.duplicateTitles.length,
    headingIssues: t.headingIssues.length,
    missingAltText: t.missingAltText.length,
    brokenInternalLinks: t.brokenInternalLinks.length,
    robotsTxtFound: t.robotsTxt.found,
    robotsTxtDisallowsAll: t.robotsTxt.disallowsEverything,
    sitemapFound: t.sitemapXml.found,
    sitemapUrlCount: t.sitemapXml.urlCount,
  };
}

/**
 * Gather the latest content gap report for a site.
 */
async function gatherCompetitorSummary(siteId) {
  const competitors = await Competitor.find({ siteId });
  if (competitors.length === 0) return null;

  const reports = await ContentGapReport.find({
    siteId,
    status: 'done',
  })
    .sort({ createdAt: -1 })
    .limit(3);

  if (reports.length === 0) return null;

  return {
    competitorCount: competitors.length,
    competitorDomains: competitors.map((c) => c.domain),
    recentGaps: reports.flatMap((r) =>
      (r.gaps || []).slice(0, 5).map((g) => ({
        topic: g.topic,
        competitorHasIt: g.competitorHasIt,
        userHasIt: g.userHasIt,
        opportunity: g.opportunity.slice(0, 200),
      })),
    ),
  };
}

/**
 * Gather a condensed ranking trend for a site.
 */
async function gatherRankingsSummary(siteId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const snapshots = await RankSnapshot.find({
    siteId,
    date: { $gte: thirtyDaysAgo },
  }).sort({ date: 1 });

  if (snapshots.length === 0) return null;

  // Calculate trend: compare first half vs second half average position
  const mid = Math.floor(snapshots.length / 2);
  const firstHalf = snapshots.slice(0, mid);
  const secondHalf = snapshots.slice(mid);

  const avg = (arr) =>
    arr.length > 0 ? Math.round((arr.reduce((s, r) => s + r.avgPosition, 0) / arr.length) * 10) / 10 : 0;

  const firstHalfAvg = avg(firstHalf);
  const secondHalfAvg = avg(secondHalf);

  // Top 10 queries by clicks
  const byQuery = {};
  for (const s of snapshots) {
    if (!byQuery[s.queryText]) byQuery[s.queryText] = { clicks: 0, impressions: 0, positions: [] };
    byQuery[s.queryText].clicks += s.clicks;
    byQuery[s.queryText].impressions += s.impressions;
    byQuery[s.queryText].positions.push(s.avgPosition);
  }

  const topQueries = Object.entries(byQuery)
    .map(([q, d]) => ({
      query: q,
      clicks: d.clicks,
      impressions: d.impressions,
      avgPosition: Math.round((d.positions.reduce((a, b) => a + b, 0) / d.positions.length) * 10) / 10,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const totalClicks = snapshots.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = snapshots.reduce((s, r) => s + r.impressions, 0);

  return {
    positionTrend: secondHalfAvg < firstHalfAvg ? 'improving' : 'declining',
    firstHalfAvgPosition: firstHalfAvg,
    secondHalfAvgPosition: secondHalfAvg,
    totalClicks,
    totalImpressions,
    topQueries,
  };
}

/**
 * Gather keyword cluster summary for a site.
 */
async function gatherKeywordSummary(siteId) {
  const keywords = await Keyword.find({ siteId }).sort({ cluster: 1 });
  if (keywords.length === 0) return null;

  const clusters = {};
  for (const kw of keywords) {
    if (!clusters[kw.cluster]) clusters[kw.cluster] = { count: 0, intents: [], avgDifficulty: 0, difficulties: [] };
    clusters[kw.cluster].count++;
    clusters[kw.cluster].intents.push(kw.intent);
    clusters[kw.cluster].difficulties.push(kw.difficultyEstimate);
  }

  // Compute average difficulty per cluster
  const clusterSummary = Object.entries(clusters).map(([name, d]) => ({
    name,
    count: d.count,
    intents: [...new Set(d.intents)],
    avgDifficulty: Math.round(d.difficulties.reduce((a, b) => a + b, 0) / d.difficulties.length),
  }));

  return {
    totalKeywords: keywords.length,
    clusters: clusterSummary,
  };
}

// ── Main agent ────────────────────────────────────────────────────────────────

/**
 * Run the action plan generation agent.
 * Gathers data from all sources, sends to Groq, returns structured plan.
 *
 * @param {ObjectId} siteId
 * @param {string}   domain
 * @returns {Promise<{summary: string, items: [{priority, agent, title, description}]}>}
 */
async function run(siteId, domain) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  // ── 1. Gather data from all sources ──────────────────────────────────
  const [auditSummary, competitorSummary, rankingsSummary, keywordSummary] = await Promise.all([
    gatherAuditSummary(siteId),
    gatherCompetitorSummary(siteId),
    gatherRankingsSummary(siteId),
    gatherKeywordSummary(siteId),
  ]);

  // ── 2. Build condensed context for Groq ──────────────────────────────
  const context = {
    domain,
    technicalAudit: auditSummary || 'No audit data available',
    competitorGaps: competitorSummary || 'No competitor data available',
    rankings: rankingsSummary || 'No GSC ranking data available',
    keywords: keywordSummary || 'No keyword research data available',
  };

  const systemPrompt = `You are an expert SEO strategist. You synthesize data from multiple sources — technical audits, competitor analysis, search rankings, and keyword research — into a single prioritized action plan for a website owner.

CRITICAL RULES:
1. You MUST return ONLY valid JSON — no markdown, no explanation, no code fences.
2. The output must be a JSON object with exactly these keys: "summary" (string, 2-3 sentences summarizing overall SEO health and the most urgent need), "items" (array of action items).
3. Each item must have: "priority" ("high", "medium", or "low"), "agent" (which area this came from: "technical", "content", "competitor", "rankings", or "keywords"), "title" (short action title, max 80 chars), "description" (specific, actionable recommendation tied to the actual data — NOT generic SEO advice).
4. Produce 8-15 items total. At least 3 high priority, 3 medium, 2 low.
5. Items MUST reference specific data from the context — e.g., "Fix 5 missing title tags found on pages X, Y, Z" not "Add title tags to your pages". If the audit found 3 broken links, mention the count. If rankings are declining, mention the trend.
6. Prioritize by impact: issues that directly affect search visibility (broken links, missing meta, declining rankings) should be high priority. Content gaps and keyword opportunities should be medium. Low-priority items are nice-to-haves.
7. The "agent" field should be the area the recommendation primarily comes from, even if it touches multiple areas.`;

  const userPrompt = `Generate a prioritized SEO action plan for "${domain}".

Here is the data gathered from all analysis sources:

${JSON.stringify(context, null, 2)}

Produce a prioritized action plan with specific, data-driven recommendations. Return ONLY a valid JSON object with keys "summary" and "items". No other text.`;

  // ── 3. Call Groq ─────────────────────────────────────────────────────
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
      timeout: 90_000,
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

  // ── 4. Validate and normalise ────────────────────────────────────────
  const validPriorities = ['high', 'medium', 'low'];
  const validAgents = ['technical', 'content', 'competitor', 'rankings', 'keywords'];

  const items = (parsed.items || [])
    .filter((item) => item.title && item.description)
    .map((item) => ({
      priority: validPriorities.includes(item.priority) ? item.priority : 'medium',
      agent: validAgents.includes(item.agent) ? item.agent : 'technical',
      title: String(item.title).trim().slice(0, 120),
      description: String(item.description).trim(),
      status: 'todo',
    }))
    .slice(0, 15);

  if (items.length === 0) {
    items.push({
      priority: 'medium',
      agent: 'technical',
      title: 'Run a technical audit',
      description:
        'No specific data was available to generate recommendations. Start by running a technical audit to identify issues.',
      status: 'todo',
    });
  }

  const summary = String(parsed.summary || 'Action plan generated based on available data.').trim();

  return { summary, items };
}

/**
 * Async runner — fire-and-forget pattern.
 * Creates the ActionPlan doc, runs the agent, updates the doc.
 */
async function runActionPlanAsync(planId, siteId, domain) {
  try {
    await ActionPlan.findByIdAndUpdate(planId, {
      status: 'running',
      startedAt: new Date(),
    });

    const result = await run(siteId, domain);

    await ActionPlan.findByIdAndUpdate(planId, {
      status: 'done',
      completedAt: new Date(),
      generatedAt: new Date(),
      summary: result.summary,
      items: result.items,
    });

    console.log(`[ActionPlan] ${planId} completed — ${result.items.length} items`);

    // ── Notification: action_plan_ready ──────────────────────────────────
    const plan = await ActionPlan.findById(planId).lean();
    if (plan) {
      const site = await Site.findById(plan.siteId).lean();
      if (site) {
        await createNotification(
          site.workspaceId.toString(),
          'action_plan_ready',
          `Action plan for ${site.domain} ready — ${result.items.length} prioritized items generated.`,
          site._id.toString(),
        );
      }
    }
  } catch (err) {
    await ActionPlan.findByIdAndUpdate(planId, {
      status: 'failed',
      completedAt: new Date(),
      error: err.message ?? 'Unknown error',
    });
    console.error(`[ActionPlan] ${planId} failed:`, err.message);
  }
}

module.exports = { run, runActionPlanAsync };
