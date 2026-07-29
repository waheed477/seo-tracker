/**
 * Keyword Research Agent
 *
 * Uses Groq (llama-3.3-70b-versatile) to expand seed keywords into topic
 * clusters, assign search intent, and estimate difficulty. This is pure
 * AI-reasoning — no crawling, no SERP data.
 *
 * What it does:
 *  1. Takes a list of seed keywords and a domain for context
 *  2. Sends a structured prompt to Groq asking for keyword expansion + clustering
 *  3. Validates and normalises the response (intent mapping, difficulty clamping)
 *  4. Returns a flat array of keyword objects with cluster, intent, and difficulty
 *
 * Runs synchronously (fast enough with Groq — ~2–5 s) but can be swapped
 * to the async job pattern if latency becomes an issue.
 *
 * IMPORTANT: difficultyEstimate is AI-generated, NOT real SERP data.
 * The Groq prompt explicitly frames this as a rough estimate, and the
 * UI must label it honestly.
 *
 * @module services/agents/keywordResearchAgent
 */

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Run keyword research on a list of seed keywords.
 *
 * @param {string[]} seedKeywords - User-provided seed keywords
 * @param {string}   domain      - Site domain for context
 * @returns {Promise<{keyword: string, cluster: string, intent: string, difficultyEstimate: number}[]>}
 */
async function run(seedKeywords, domain) {
  if (!seedKeywords || seedKeywords.length === 0) {
    throw new Error('At least one seed keyword is required');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const keywordList = seedKeywords.map((k) => `"${k}"`).join(', ');

  const systemPrompt = `You are an expert SEO keyword research assistant. You cluster keywords into topic groups, assign search intent, and estimate keyword difficulty.

CRITICAL RULES:
1. You MUST return ONLY valid JSON — no markdown, no explanation, no code fences.
2. The output must be a JSON array of objects with exactly these keys: keyword, cluster, intent, difficultyEstimate.
3. "intent" must be one of: "informational", "transactional", "navigational", "commercial".
4. "difficultyEstimate" must be an integer 0–100.
5. "cluster" should be a short descriptive name for the topic group (e.g., "Content Marketing", "Email Automation", "Pricing").
6. "difficultyEstimate" is a ROUGH ESTIMATE based on your general knowledge of keyword competitiveness — it is NOT real search data, not from any SERP tool, and should not be treated as authoritative. You must acknowledge this framing in your output by including a field "isEstimate": true on every object.
7. Include the seed keywords AND generate 3–5 additional related keywords per seed keyword to expand the cluster.
8. Each keyword should appear exactly once in the output.`;

  const userPrompt = `I have a website about "${domain}" and the following seed keywords: ${keywordList}.

Please:
1. Expand each seed keyword into 3–5 related keywords.
2. Cluster ALL keywords (seeds + expanded) into logical topic groups.
3. Assign search intent (informational, transactional, navigational, or commercial) to each keyword.
4. Give a rough difficulty estimate 0–100 for each keyword. Remember: this is a rough AI estimate, NOT real search data. Do NOT claim it comes from any SERP tool.

Return ONLY a valid JSON array. Each element must have: keyword, cluster, intent, difficultyEstimate, isEstimate (always true). No other text.`;

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
  if (!raw) {
    throw new Error('Empty response from Groq');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Groq returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  // Groq may return { keywords: [...] } or just the array
  const keywords = Array.isArray(parsed) ? parsed : (parsed.keywords ?? parsed.results ?? []);

  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error('No keywords returned from Groq');
  }

  // Validate and normalise each entry
  const validIntents = ['informational', 'transactional', 'navigational', 'commercial'];

  const cleaned = keywords
    .filter((k) => k.keyword && k.cluster && k.intent)
    .map((k) => ({
      keyword: String(k.keyword).trim(),
      cluster: String(k.cluster).trim(),
      intent: validIntents.includes(k.intent) ? k.intent : 'informational',
      difficultyEstimate:
        typeof k.difficultyEstimate === 'number' ? Math.max(0, Math.min(100, Math.round(k.difficultyEstimate))) : 50,
    }));

  if (cleaned.length === 0) {
    throw new Error('No valid keywords after parsing Groq response');
  }

  return cleaned;
}

module.exports = { run };
