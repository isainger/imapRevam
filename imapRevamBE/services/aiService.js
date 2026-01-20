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

module.exports = { improveHtmlWithAI };
