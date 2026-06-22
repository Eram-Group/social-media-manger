// Lightweight OpenAI client for the EPCC demo (client-side only).
// Reads the key from import.meta.env.VITE_OPENAI_API_KEY. If the key is missing
// or a request fails, every function gracefully falls back to canned EPCC content
// AND surfaces the reason via `error` so the UI can show what happened.

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
const TEXT_MODEL = 'gpt-4o-mini';
// This org's key exposes gpt-image-1 (not dall-e-3). gpt-image-1 returns base64.
const IMAGE_MODEL = 'gpt-image-1';

export const hasOpenAIKey = (): boolean => Boolean(API_KEY && API_KEY.length > 20);

const CHAMBER_SYSTEM =
  'You are the social-media manager for the Eastern Province Chamber of Commerce (EPCC) in Saudi Arabia. ' +
  'You write concise, professional, engaging social posts aligned with Saudi Vision 2030, the business community, ' +
  'investment, SMEs, trade and events. Keep brand voice credible and modern.';

async function apiError(resp: Response): Promise<string> {
  try {
    const j = await resp.json();
    return j?.error?.message || `HTTP ${resp.status}`;
  } catch {
    return `HTTP ${resp.status}`;
  }
}

async function chat(prompt: string, system = CHAMBER_SYSTEM): Promise<string> {
  if (!hasOpenAIKey()) throw new Error('No OpenAI key set');
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    }),
  });
  if (!resp.ok) throw new Error(await apiError(resp));
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content?.trim() ?? '';
}

// ---- Public API ----
export interface IGenResult {
  text: string;
  source: 'openai' | 'fallback';
  error?: string;
}

const FALLBACK_POSTS = [
  'The Eastern Province Investment Forum 2026 is almost here 🇸🇦 Connecting investors with the Kingdom’s fastest-growing non-oil sectors. Registration is open — link in bio. #Vision2030 #EPChamber',
  'Proud to spotlight the SMEs powering Dammam, Khobar and Dhahran. Your growth is the Province’s growth. 💼 Tell us your story below. #SME #EasternProvince',
  'Trade & logistics are the backbone of the Eastern Province economy. Join our upcoming summit to shape what comes next. 🚢📦 #Logistics #EPChamber',
];

export async function generatePost(brief: string, platform?: string): Promise<IGenResult> {
  const prompt =
    `Write one ready-to-publish social post for the ${platform ?? 'main'} platform about: "${brief}". ` +
    'Include 1-2 relevant emojis and 2-3 hashtags. Keep it under 280 characters.';
  try {
    const text = await chat(prompt);
    if (text) return { text, source: 'openai' };
    return { text: FALLBACK_POSTS[0], source: 'fallback', error: 'Empty response' };
  } catch (e) {
    const pick = FALLBACK_POSTS[Math.floor((brief.length || 1) % FALLBACK_POSTS.length)];
    return { text: pick, source: 'fallback', error: (e as Error).message };
  }
}

export interface IIdea {
  title: string;
  detail: string;
}

export async function generateIdeas(
  context: string,
  count = 5,
): Promise<{ ideas: IIdea[]; source: 'openai' | 'fallback'; error?: string }> {
  const prompt =
    `Suggest ${count} social content ideas for the Eastern Province Chamber of Commerce about "${context}". ` +
    'Return ONLY a JSON array of objects with keys "title" and "detail" (detail <= 160 chars). No prose, no code fences.';
  try {
    const raw = await chat(prompt);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (Array.isArray(parsed) && parsed.length) return { ideas: parsed.slice(0, count), source: 'openai' };
    throw new Error('Unexpected response');
  } catch (e) {
    return {
      source: 'fallback',
      error: (e as Error).message,
      ideas: [
        { title: 'SME founder mini-series (3 reels)', detail: 'Spotlight three member companies in 30-second vertical videos.' },
        { title: 'Vision 2030 economic brief carousel', detail: 'Translate the latest non-oil growth figures into member insights.' },
        { title: '“Ask the Chamber” live Q&A', detail: 'Address member response-time concerns with a scheduled live session.' },
        { title: 'Logistics & Trade summit countdown', detail: '4-day teaser campaign with speaker highlights to drive registrations.' },
        { title: 'Women-in-business networking recap', detail: 'UGC reel from the last session — strong fit for the 25–34 segment.' },
      ].slice(0, count),
    };
  }
}

export interface IMetaResult {
  tags: string[];
  seoTitle: string;
  altText: string;
  source: 'openai' | 'fallback';
  error?: string;
}

// Generate hashtags + an SEO title (+ image alt text) from the post text/brief.
export async function generateMeta(text: string): Promise<IMetaResult> {
  const fallback: IMetaResult = {
    tags: ['EPChamber', 'Vision2030', 'EasternProvince', 'SME'],
    seoTitle: 'Eastern Province Chamber of Commerce — latest update',
    altText: 'Eastern Province Chamber of Commerce branded social graphic',
    source: 'fallback',
  };
  const prompt =
    `For this social post: "${text || 'Eastern Province Chamber of Commerce update'}", return ONLY JSON ` +
    '{"tags":["..."],"seoTitle":"...","altText":"..."} with 4-6 hashtag words (no # symbol), an SEO title ' +
    '(<=60 chars), and concise image alt text. No code fences, no prose.';
  try {
    const raw = await chat(prompt);
    const j = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      tags: Array.isArray(j.tags) ? j.tags.map((t: string) => String(t).replace(/^#/, '')).slice(0, 6) : fallback.tags,
      seoTitle: j.seoTitle || fallback.seoTitle,
      altText: j.altText || fallback.altText,
      source: 'openai',
    };
  } catch (e) {
    return { ...fallback, error: (e as Error).message };
  }
}

export async function generateInsight(context: string, fallback: string): Promise<IGenResult> {
  const prompt =
    `In 1-2 sentences, give the Eastern Province Chamber of Commerce social team an actionable insight about: ${context}. ` +
    'Be specific and practical. No preamble.';
  try {
    const text = await chat(prompt);
    if (text) return { text, source: 'openai' };
    return { text: fallback, source: 'fallback', error: 'Empty response' };
  } catch (e) {
    return { text: fallback, source: 'fallback', error: (e as Error).message };
  }
}

const SUPPORT_SYSTEM =
  'You are a 24/7 support agent for the EPCC unified social-media platform. Help the Chamber social team with ' +
  'platform issues: connecting accounts, scheduling, failed posts, analytics, billing and emergencies. ' +
  'Be warm, concise (2-4 sentences), and give clear next steps. If it sounds urgent/outage-related, reassure them ' +
  'a specialist is on call and share that the 24/7 hotline is +966 13 000 0000.';

const SUPPORT_FALLBACKS = [
  'Thanks for reaching out! I can help with that. Could you tell me which platform and account it’s happening on so I can check the connection status?',
  'Got it — for scheduling issues, try re-syncing the account from the Accounts page first. If it persists, I’ll escalate to a specialist right away.',
  'I understand this is urgent. A specialist is on call 24/7 — you can also reach our hotline at +966 13 000 0000. Meanwhile, can you share a screenshot of the error?',
];

export async function supportReply(message: string, turn = 0): Promise<IGenResult> {
  try {
    const text = await chat(message, SUPPORT_SYSTEM);
    if (text) return { text, source: 'openai' };
    return { text: SUPPORT_FALLBACKS[turn % SUPPORT_FALLBACKS.length], source: 'fallback', error: 'Empty response' };
  } catch (e) {
    return { text: SUPPORT_FALLBACKS[turn % SUPPORT_FALLBACKS.length], source: 'fallback', error: (e as Error).message };
  }
}

const ASSISTANT_SYSTEM =
  'You are the AI assistant inside the Eastern Province Chamber of Commerce social-media platform. ' +
  'Help the social team plan content, analyse performance, suggest post ideas, write captions, pick best times, ' +
  'and answer questions about their X, Instagram, LinkedIn, Facebook, Snapchat and TikTok channels. ' +
  'Be concise, friendly and practical — short paragraphs or tight bullet lists.';

const ASSISTANT_FALLBACKS = [
  'Here are three quick wins: 1) Post the Investment Forum reel Tue 8 PM, 2) turn the SME story into a LinkedIn carousel, 3) reply to the top 5 mentions today. Want me to draft any of these?',
  'Based on this month, short-form video on TikTok & Instagram is your strongest format (+38% reach). I can outline a 3-part reel series for next week.',
  'Engagement peaks weeknights 7–9 PM and Sunday mornings on LinkedIn. Schedule investor content for Sunday 10 AM and member stories for weeknights.',
];

export async function assistantReply(message: string, turn = 0): Promise<IGenResult> {
  try {
    const text = await chat(message, ASSISTANT_SYSTEM);
    if (text) return { text, source: 'openai' };
    return { text: ASSISTANT_FALLBACKS[turn % ASSISTANT_FALLBACKS.length], source: 'fallback', error: 'Empty response' };
  } catch (e) {
    return { text: ASSISTANT_FALLBACKS[turn % ASSISTANT_FALLBACKS.length], source: 'fallback', error: (e as Error).message };
  }
}

export interface IImageResult {
  url: string;
  source: 'openai' | 'fallback';
  error?: string;
}

export interface IVideoResult {
  url: string;
  source: 'openai' | 'fallback';
  error?: string;
}

const SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Real AI video via the Sora API (async: create job → poll → download mp4 blob).
// Time-boxed (~3 min); falls back to a sample clip if unavailable/slow/no access.
export async function generateVideo(prompt: string, portrait = true): Promise<IVideoResult> {
  const fallback = (error?: string): IVideoResult => ({ url: SAMPLE_VIDEO, source: 'fallback', error });
  if (!hasOpenAIKey()) return fallback('No OpenAI key set');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` };
  try {
    const create = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: 'sora-2', prompt, size: portrait ? '720x1280' : '1280x720', seconds: '4' }),
    });
    if (!create.ok) return fallback(await apiError(create));
    let job = await create.json();
    for (let i = 0; i < 36; i++) {
      if (job.status === 'completed') break;
      if (job.status === 'failed') return fallback(job?.error?.message || 'Generation failed');
      await sleep(5000);
      const s = await fetch(`https://api.openai.com/v1/videos/${job.id}`, { headers });
      if (!s.ok) return fallback(await apiError(s));
      job = await s.json();
    }
    if (job.status !== 'completed') return fallback('Timed out — video still rendering');
    const content = await fetch(`https://api.openai.com/v1/videos/${job.id}/content`, { headers });
    if (!content.ok) return fallback(await apiError(content));
    return { url: URL.createObjectURL(await content.blob()), source: 'openai' };
  } catch (e) {
    return fallback((e as Error).message);
  }
}

// gpt-image-1 returns base64 → we build a data URL. Falls back to a themed
// placeholder, but reports the real error so the UI isn't silently wrong.
export async function generateImage(prompt: string): Promise<IImageResult> {
  const placeholder = (error?: string): IImageResult => ({
    url: `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 40) || 'epcc')}/1024/1024`,
    source: 'fallback',
    error,
  });
  if (!hasOpenAIKey()) return placeholder('No OpenAI key set');
  try {
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: `${prompt}. Professional, on-brand social media visual for a Saudi chamber of commerce.`,
        n: 1,
        size: '1024x1024',
      }),
    });
    if (!resp.ok) return placeholder(await apiError(resp));
    const json = await resp.json();
    const item = json?.data?.[0];
    if (item?.b64_json) return { url: `data:image/png;base64,${item.b64_json}`, source: 'openai' };
    if (item?.url) return { url: item.url, source: 'openai' };
    return placeholder('No image returned');
  } catch (e) {
    return placeholder((e as Error).message);
  }
}
