const sanitizeEmailHtml = require("../utils/sanitizeEmailHtml");
const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Grammar-only prompt
 * No context change, no rewriting
 */
function buildPrompt(html) {
  return `
You are an AI writing assistant working on HTML content.

CRITICAL, NON-NEGOTIABLE RULES:
- DO NOT add, remove, rename, or reorder ANY HTML tags
- DO NOT change attributes, styles, or inline formatting
- DO NOT move text across HTML tags
- Preserve the HTML structure EXACTLY as provided
- Return ONLY valid HTML

YOU MAY:
- Improve clarity, tone, and flow of the text
- Fix grammar, spelling, punctuation, and casing
- Rewrite sentences for better readability
- Make the language sound natural and professional
- Keep the original meaning intact

IMPORTANT:
- Only modify the TEXT CONTENT inside existing tags
- If text is already clear, leave it unchanged
- Do not introduce new information
- Do not remove disclaimers or intent

HTML TO IMPROVE:
${html}
`;
}


/**
 * Improve HTML while preserving formatting
 */
async function improveHtmlWithAI(html) {
  if (!html) return "";

  const prompt = buildPrompt(html);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "You strictly preserve HTML." },
      { role: "user", content: prompt },
    ],
  });

  const improvedHtml = completion.choices[0].message.content.trim();
  return sanitizeEmailHtml(improvedHtml);
}

const DASHBOARD_INSIGHTS_SYSTEM = `You are a concise incident-management operations assistant for Taboola IMAP.

Rules:
- Base every point ONLY on the JSON snapshot. Do not invent incident IDs, numbers, or facts not present.
- Output exactly 4–6 lines. Each line must start with "• " (bullet + space).
- Total under 140 words. Plain text only — no markdown headings, no code fences.
- Prioritize: what needs attention first, status/RCA hygiene, cross-team load if performer data exists, and one practical next step when the data supports it.
- If the snapshot has zero incidents or almost no detail, give short, honest operational best-practice reminders without pretending you see specific tickets.`;

/**
 * @param {Record<string, unknown>} snapshot — compact dashboard JSON from the client
 * @returns {Promise<string>}
 */
async function generateDashboardInsights(snapshot) {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("OPENAI_API_KEY is not set");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const payload =
    typeof snapshot === "object" && snapshot !== null
      ? JSON.stringify(snapshot)
      : "{}";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 450,
    messages: [
      { role: "system", content: DASHBOARD_INSIGHTS_SYSTEM },
      {
        role: "user",
        content: `Current dashboard snapshot (JSON). Respond with bullets only.\n${payload}`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || "";
  return text;
}

module.exports = { improveHtmlWithAI, generateDashboardInsights };
