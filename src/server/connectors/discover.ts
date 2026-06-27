// Instagram Hashtag Search — content discovery & market intelligence.
//
// The legit way to learn what's working around the Chamber's topics WITHOUT the
// (app-review-gated) ability to read competitor Pages. Flow per hashtag:
//   1. GET /ig_hashtag_search?user_id={ig}&q={tag}   -> resolve the hashtag id
//   2. GET /{hashtag-id}/top_media (or /recent_media) -> public posts + engagement
//
// Permissions: instagram_basic + pages_read_engagement on a self-managed IG
// Business account — already granted; NO extra App Review needed.
// Caveats (Meta): max 30 unique hashtags / 7 days per IG user; the response omits
// the author's username; `q` must NOT include the leading "#".
import { graphGet } from './meta';

export interface HashtagMedia {
  id: string;
  caption?: string;
  mediaType?: string;
  likeCount: number;
  commentsCount: number;
  permalink?: string;
  timestamp?: string;
  mediaUrl?: string;
  eng: number;
}

export interface HashtagResult {
  tag: string; // without the leading '#'
  id?: string; // resolved IG hashtag id
  top: HashtagMedia[];
  recent: HashtagMedia[];
  topEng: number; // total engagement across `top` — used to rank tags
  /** Set when the hashtag could not be read (unknown tag, rate limit, etc.). */
  error?: string;
}

// `like_count`/`comments_count` are the only engagement fields hashtag media expose.
const MEDIA_FIELDS = 'id,caption,media_type,comments_count,like_count,permalink,timestamp,media_url';

function shapeMedia(raw: any): HashtagMedia {
  const likeCount = raw.like_count ?? 0;
  const commentsCount = raw.comments_count ?? 0;
  return {
    id: raw.id,
    caption: raw.caption,
    mediaType: raw.media_type,
    likeCount,
    commentsCount,
    permalink: raw.permalink,
    timestamp: raw.timestamp,
    mediaUrl: raw.media_url,
    eng: likeCount + commentsCount,
  };
}

// Resolve a hashtag name to its stable IG id (required before reading media).
export async function searchHashtagId(igUserId: string, token: string, tag: string): Promise<string> {
  const j = await graphGet<{ data: { id: string }[] }>('ig_hashtag_search', {
    user_id: igUserId,
    q: tag,
    access_token: token,
  });
  const id = j.data?.[0]?.id;
  if (!id) throw new Error(`No Instagram hashtag found for "${tag}".`);
  return id;
}

export async function fetchHashtagMedia(
  hashtagId: string,
  igUserId: string,
  token: string,
  edge: 'top_media' | 'recent_media',
  limit = 12,
): Promise<HashtagMedia[]> {
  const j = await graphGet<{ data: any[] }>(`${hashtagId}/${edge}`, {
    user_id: igUserId, // the searcher — REQUIRED by Meta on these edges
    fields: MEDIA_FIELDS,
    limit: String(limit),
    access_token: token,
  });
  return (j.data ?? []).map(shapeMedia);
}

// Fetch one hashtag's top + recent media. Never throws — a bad/unknown/rate-limited
// tag returns an {error} result so one tag can't sink the whole discovery view.
export async function fetchHashtag(tag: string, igUserId: string, token: string): Promise<HashtagResult> {
  const clean = tag.replace(/^#/, '').trim();
  try {
    const id = await searchHashtagId(igUserId, token, clean);
    const [top, recent] = await Promise.all([
      fetchHashtagMedia(id, igUserId, token, 'top_media', 12).catch(() => [] as HashtagMedia[]),
      fetchHashtagMedia(id, igUserId, token, 'recent_media', 12).catch(() => [] as HashtagMedia[]),
    ]);
    return { tag: clean, id, top, recent, topEng: top.reduce((s, m) => s + m.eng, 0) };
  } catch (e) {
    const msg = (e as Error).message;
    const friendly = /rate limit|#(4|17|32|613)\b/i.test(msg)
      ? 'Instagram hashtag rate limit reached (max 30 unique tags / 7 days). Try fewer tags or wait.'
      : msg;
    return { tag: clean, top: [], recent: [], topEng: 0, error: friendly };
  }
}
