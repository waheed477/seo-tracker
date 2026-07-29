/**
 * Content SEO Agent
 *
 * Uses Groq (llama-3.3-70b-versatile) to analyze a page's content for SEO quality.
 *
 * What it does:
 *  1. Takes page text content and target keywords as input
 *  2. Truncates content to 12,000 chars to stay within Groq token limits
 *  3. Sends a structured prompt asking for keyword usage, structure, and readability analysis
 *  4. Returns an overall assessment, 3–5 specific suggestions, and an estimated readability level
 *
 * This is pure AI-reasoning — no crawling. Runs synchronously (~2–5 s).
 *
 * @module services/agents/contentSeoAgent
 */

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Run content SEO analysis.
 *
 * @param {string}   content        - Page text content to analyze
 * @param {string[]} targetKeywords - Keywords the content should target
 * @returns {Promise<{overallAssessment: string, suggestions: [{issue: string, recommendation: string}], estimatedReadability: string}>}
 */
async function run(content, targetKeywords) {
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for analysis');
  }
  if (!targetKeywords || targetKeywords.length === 0) {
    throw new Error('At least one target keyword is required');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const kwList = targetKeywords.map((k) => `"${k}"`).join(', ');

  // Truncate very long content to avoid token limits
  const maxChars = 12_000;
  const truncatedContent =
    content.length > maxChars ? content.slice(0, maxChars) + '\n\n[Content truncated for analysis]' : content;

  const systemPrompt = `You are an expert SEO content analyst. You review web content for SEO quality and provide specific, actionable recommendations.

CRITICAL RULES:
1. You MUST return ONLY valid JSON — no markdown, no explanation, no code fences.
2. The output must be a JSON object with exactly these keys: overallAssessment, suggestions, estimatedReadability.
3. "overallAssessment" is a string (2–3 sentences) summarizing the content's SEO quality.
4. "suggestions" is an array of 3–5 objects, each with "issue" (short description of the problem) and "recommendation" (specific, actionable fix).
5. "estimatedReadability" is a string: one of "Easy", "Moderate", or "Difficult".
6. Analyze: keyword usage/density (qualitative, not just counting), content structure (headings, paragraphs, lists), readability, and topical relevance.
7. Be specific — don't say "use keywords more" — say exactly where and how.`;

  const userPrompt = `Please analyze the following content for SEO quality.

Target keywords: ${kwList}

Content:
---
${truncatedContent}
---

Return ONLY a valid JSON object with: overallAssessment, suggestions (array of {issue, recommendation}), estimatedReadability. No other text.`;

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
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

  // Validate and normalise
  const validReadability = ['Easy', 'Moderate', 'Difficult'];

  const result = {
    overallAssessment: String(parsed.overallAssessment ?? 'No assessment provided.').trim(),
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions
          .filter((s) => s.issue && s.recommendation)
          .map((s) => ({
            issue: String(s.issue).trim(),
            recommendation: String(s.recommendation).trim(),
          }))
          .slice(0, 5)
      : [],
    estimatedReadability: validReadability.includes(parsed.estimatedReadability)
      ? parsed.estimatedReadability
      : 'Moderate',
  };

  if (result.suggestions.length === 0) {
    result.suggestions.push({
      issue: 'No specific suggestions generated',
      recommendation: 'Consider reviewing the content manually for keyword placement and readability improvements.',
    });
  }

  return result;
}

module.exports = { run };
