// Server-side OpenAI helpers for the client report: comment sentiment + themes,
// and an executive summary. Gracefully degrades (returns neutral/empty) when no
// key is set or a call fails — the report still renders with the real metrics.
const API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini';

async function chatJSON<T>(system: string, user: string, fallback: T): Promise<T> {
  if (!API_KEY) return fallback;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) return fallback;
    const j = await resp.json();
    const txt = j?.choices?.[0]?.message?.content;
    return txt ? (JSON.parse(txt) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface SentimentResult {
  positive: number;
  neutral: number;
  negative: number;
  themes: { theme: string; sentiment: 'positive' | 'neutral' | 'negative'; mentions: number }[];
  source: 'openai' | 'fallback';
}

// Classify a batch of real comments into sentiment + recurring themes.
export async function analyzeSentiment(comments: string[]): Promise<SentimentResult> {
  const fallback: SentimentResult = { positive: 0, neutral: 0, negative: 0, themes: [], source: 'fallback' };
  const cleaned = comments.map((c) => (c || '').trim()).filter(Boolean).slice(0, 200);
  if (!cleaned.length) return fallback;
  if (!API_KEY) {
    // No AI — return a neutral split so the report still shows the comment volume.
    return { positive: 0, neutral: cleaned.length, negative: 0, themes: [], source: 'fallback' };
  }
  const result = await chatJSON<SentimentResult>(
    'You are an analyst for the Eastern Province Chamber of Commerce. Classify the sentiment of audience comments and extract recurring themes. Return strict JSON.',
    `Comments (one per line):\n${cleaned.join('\n')}\n\n` +
      'Return JSON: {"positive":<count>,"neutral":<count>,"negative":<count>,"themes":[{"theme":"short label","sentiment":"positive|neutral|negative","mentions":<count>}]}. ' +
      'Counts must sum to the number of comments. Provide up to 6 themes.',
    fallback,
  );
  return { ...result, source: result.themes ? 'openai' : 'fallback' };
}

// A short executive summary of the period's performance for Chamber leadership.
export async function executiveSummary(facts: Record<string, unknown>): Promise<string> {
  const fallback =
    'Performance summary is available from the metrics below. Connect AI (set OPENAI_API_KEY) for an auto-written executive summary.';
  if (!API_KEY) return fallback;
  const r = await chatJSON<{ summary: string }>(
    'You are the social media strategist for the Eastern Province Chamber of Commerce (EPCC) in Saudi Arabia. Write a concise, professional executive summary for leadership.',
    `Based on this real data, write a 3-4 sentence executive summary highlighting reach, engagement, audience and one clear recommendation. Data: ${JSON.stringify(facts)}. Return JSON {"summary":"..."}.`,
    { summary: fallback },
  );
  return r.summary || fallback;
}
