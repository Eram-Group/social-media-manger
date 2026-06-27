import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { getCached } from '@/server/cache';
import { fetchHashtag, HashtagResult } from '@/server/connectors/discover';
import { HASHTAGS } from '@/server/connectors/hashtags.config';

// GET /api/discover — content discovery via the Instagram Hashtag Search API.
// For each tracked hashtag we return the top & most-recent PUBLIC posts plus their
// engagement, ranked by which hashtag is driving the most engagement right now.
// This is the legit market-intelligence path (competitor Pages need app review).
//
// Query: ?tags=foo,bar  adds ad-hoc hashtags (counts against Meta's 30-unique/7d
// limit); ?refresh=1 forces a fresh pull. Cached 6h to stay inside the limit.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const force = url.searchParams.get('refresh') === '1';
  const extra = (url.searchParams.get('tags') || '')
    .split(',')
    .map((s) => s.replace(/^#/, '').trim())
    .filter(Boolean);
  // Merge config + ad-hoc, de-dupe (case-insensitive), and hard-cap at 30 (Meta's limit).
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const t of [...HASHTAGS, ...extra]) {
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); tags.push(t); }
  }
  const capped = tags.slice(0, 30);

  const key = `discover:${capped.join('|').toLowerCase()}`;
  const cached = await getCached(key, 6 * 60 * 60, () => computeDiscover(capped), force);
  return NextResponse.json({ ...cached.data, cachedAt: cached.cachedAt, fromCache: cached.fromCache });
}

async function computeDiscover(tags: string[]) {
  const accounts = await listAccounts();
  const ig = accounts.find((a) => a.platform === 'instagram');
  if (!ig) {
    return { ok: true, available: false, reason: 'no-instagram', hashtags: [] as HashtagResult[] };
  }

  // Sequential (not parallel) — the hashtag endpoints are tightly rate-limited.
  const hashtags: HashtagResult[] = [];
  for (const tag of tags) {
    hashtags.push(await fetchHashtag(tag, ig.accountId, ig.accessToken));
  }
  hashtags.sort((a, b) => b.topEng - a.topEng);

  return {
    ok: true,
    available: true,
    account: { id: ig.accountId, name: ig.name ?? null },
    hashtags,
  };
}
