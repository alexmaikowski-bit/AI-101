module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { idea } = body || {};

  if (!idea || typeof idea !== 'string' || !idea.trim()) {
    return res.status(400).json({ error: 'Idea required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable not set on Vercel' });
  }

  const metaPrompt = `You are helping a media-agency strategist at WPP turn a custom use case into a starter prompt for their AI coding agent (Claude Code, Cursor, OpenAI Codex, etc.).

Their idea:
"${idea.trim()}"

Generate a clean, ready-to-paste prompt that follows this structure exactly:

1. Open with one or two sentences stating what they want to build, written in the strategist's voice (first person, "I want to build...").

2. Provide a "Context:" section listing 3-5 placeholders the user fills in, marked as [PLACEHOLDER NAME] in square brackets. Examples: [BRAND NAME], [AUDIENCE], [STRATEGIC POV], [KEY METRICS], etc. Choose placeholders essential for THIS specific idea.

3. Specify what the build should include — a numbered list of 4-6 page sections or build components, written confidently in editorial-strategist language.

4. Specify the design direction: editorial long-read style (NOT a SaaS landing page), Fraunces serif for display, Inter Tight for body, neon cyan accents used sparingly. Include 1-2 aesthetic references that fit the idea (Bloomberg long-read, The Drift, Highsnobiety, Wallpaper magazine, The Face, etc.).

5. End with: "Before you write any code, describe the design direction in plain language and ask me three sharpening questions a senior planner would ask."

IMPORTANT formatting rules:
- Output ONLY the prompt text. No preamble like "Here is the prompt:" — output the prompt directly.
- Do not wrap in code blocks or markdown formatting.
- Use plain text dashes (-) for context items.
- Use numbered "1." through "5." for the build sections.
- Keep [PLACEHOLDERS] in square brackets without surrounding emphasis.
- Maintain a confident, strategist's tone throughout — not corporate.`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: metaPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Gemini API error: ${errText}` });
    }

    const data = await response.json();
    const prompt = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!prompt) {
      return res.status(500).json({ error: 'No prompt returned from Gemini' });
    }

    return res.status(200).json({ prompt: prompt.trim() });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
