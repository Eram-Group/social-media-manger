import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, listHidden, listPublishedPosts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';
import { ttPost, ensureFreshToken as ensureTiktokToken } from '@/server/connectors/tiktok';
import { getCached } from '@/server/cache';
import { IPost } from '@/mock-server/posts';

// GET /api/posts/list — real posts from connected Pages / Instagram accounts.
// Cached (15 min) so navigating to the page doesn't re-hit Meta every time;
// pass ?refresh=1 to force a live pull.
export async function GET(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const cached = await getCached('posts:list', 15 * 60, fetchPosts, force);
  // Apply the hidden filter on every request (not cached) so removing a post
  // from the dashboard takes effect immediately without a fresh Meta call.
  const hidden = await listHidden();
  const posts = (cached.data as IPost[]).filter((p) => {
    const refs = p.remoteRefs ?? [];
    return !refs.length || !refs.every((r) => hidden.has(r.remoteId));
  });
  return NextResponse.json({ posts, cachedAt: cached.cachedAt, fromCache: cached.fromCache, stale: cached.stale });
}

async function fetchPosts(): Promise<IPost[]> {
  const accounts = await listAccounts();
  const posts: IPost[] = [];

  for (const acc of accounts) {
    try {
      if (acc.platform === 'facebook') {
        const r = await graphGet<{ data: any[] }>(`${acc.accountId}/posts`, {
          access_token: acc.accessToken,
          fields: 'id,message,created_time,permalink_url,full_picture,status_type,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
          limit: '50',
        });
        for (const p of r.data ?? []) {
          // status_type: added_video -> video; added_photos/mobile_status_update -> post
          const fmt = p.status_type === 'added_video' ? 'video' : 'post';
          posts.push({
            id: p.id,
            content: p.message ?? '(no caption)',
            platforms: ['facebook'],
            date: (p.created_time ?? '').slice(0, 10),
            time: (p.created_time ?? '').slice(11, 16),
            status: 'published',
            type: 'post',
            format: fmt,
            likes: p.likes?.summary?.total_count ?? 0,
            comments: p.comments?.summary?.total_count ?? 0,
            shares: p.shares?.count ?? 0,
            media: p.full_picture ? [p.full_picture] : undefined,
            remoteRefs: [{ platform: 'facebook', accountId: acc.accountId, remoteId: p.id, url: p.permalink_url }],
          });
        }
        // Facebook stories live on a separate edge (ephemeral, ~24h).
        try {
          const st = await graphGet<{ data: any[] }>(`${acc.accountId}/stories`, {
            access_token: acc.accessToken,
            fields: 'post_id,status,creation_time,media_type,url,media_id',
            limit: '50',
          });
          for (const p of st.data ?? []) {
            const ts = p.creation_time ? new Date(Number(p.creation_time) * 1000).toISOString() : '';
            posts.push({
              id: p.post_id || p.media_id,
              content: '(story)',
              platforms: ['facebook'],
              date: ts.slice(0, 10),
              time: ts.slice(11, 16),
              status: 'published',
              type: 'post',
              format: 'story',
              remoteRefs: [{ platform: 'facebook', accountId: acc.accountId, remoteId: p.post_id || p.media_id, url: p.url }],
            });
          }
        } catch (e) {
          console.warn(`[posts/list] FB stories failed:`, (e as Error).message);
        }
      } else if (acc.platform === 'instagram') {
        const r = await graphGet<{ data: any[] }>(`${acc.accountId}/media`, {
          access_token: acc.accessToken,
          fields: 'id,caption,timestamp,permalink,media_url,media_type,media_product_type,like_count,comments_count',
          limit: '50',
        });
        for (const p of r.data ?? []) {
          // media_product_type: REELS/STORY; media_type: VIDEO/IMAGE/CAROUSEL_ALBUM
          const fmt = p.media_product_type === 'REELS' ? 'reel'
            : p.media_product_type === 'STORY' ? 'story'
            : p.media_type === 'VIDEO' ? 'video' : 'post';
          posts.push({
            id: p.id,
            content: p.caption ?? '(no caption)',
            platforms: ['instagram'],
            date: (p.timestamp ?? '').slice(0, 10),
            time: (p.timestamp ?? '').slice(11, 16),
            status: 'published',
            type: 'post',
            format: fmt,
            likes: p.like_count ?? 0,
            comments: p.comments_count ?? 0,
            media: p.media_url ? [p.media_url] : undefined,
            remoteRefs: [{ platform: 'instagram', accountId: acc.accountId, remoteId: p.id, url: p.permalink }],
          });
        }
        // Active (non-expired) Instagram stories live on a separate edge.
        try {
          const st = await graphGet<{ data: any[] }>(`${acc.accountId}/stories`, {
            access_token: acc.accessToken,
            fields: 'id,caption,timestamp,permalink,media_url,media_type',
            limit: '50',
          });
          for (const p of st.data ?? []) {
            posts.push({
              id: p.id,
              content: p.caption ?? '(story)',
              platforms: ['instagram'],
              date: (p.timestamp ?? '').slice(0, 10),
              time: (p.timestamp ?? '').slice(11, 16),
              status: 'published',
              type: 'post',
              format: 'story',
              media: p.media_url ? [p.media_url] : undefined,
              remoteRefs: [{ platform: 'instagram', accountId: acc.accountId, remoteId: p.id, url: p.permalink }],
            });
          }
        } catch (e) {
          console.warn(`[posts/list] IG stories failed:`, (e as Error).message);
        }
      } else if (acc.platform === 'tiktok') {
        // Existing TikTok posts (published outside this app). Needs the
        // `video.list` scope — accounts connected before that scope was added
        // will 403 here until they reconnect. Photo-only posts are not returned
        // by this endpoint; it lists videos.
        const fresh = await ensureTiktokToken(acc);
        const r = await ttPost<{ data?: { videos?: any[] } }>(
          fresh.accessToken,
          '/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,like_count,comment_count,share_count,view_count',
          { max_count: 20 },
        );
        for (const v of r.data?.videos ?? []) {
          const iso = new Date((v.create_time ?? 0) * 1000).toISOString();
          posts.push({
            id: String(v.id),
            content: v.video_description || v.title || '(no caption)',
            platforms: ['tiktok'],
            date: iso.slice(0, 10),
            time: iso.slice(11, 16),
            status: 'published',
            type: 'post',
            format: 'video',
            likes: v.like_count ?? 0,
            comments: v.comment_count ?? 0,
            media: v.cover_image_url ? [v.cover_image_url] : undefined,
            remoteRefs: [{ platform: 'tiktok', accountId: acc.accountId, remoteId: String(v.id), url: v.share_url }],
          });
        }
      }
    } catch (e) {
      console.warn(`[posts/list] failed for ${acc.platform}:${acc.accountId}:`, (e as Error).message);
    }
  }

  // Locally-persisted posts for platforms we can't read back (LinkedIn member
  // posts). Included so they stay in the list after a reload.
  try {
    for (const rec of await listPublishedPosts()) {
      const d = new Date(rec.createdAt * 1000).toISOString();
      posts.push({
        // URL-safe id (the full URN with colons lives in remoteRefs); colons in
        // the id break the /epcc-demo/posts/[id] route.
        id: `${rec.platform}_${rec.remoteId.replace(/[^a-zA-Z0-9]+/g, '_')}`,
        content: rec.message || '(no caption)',
        platforms: [rec.platform as IPost['platforms'][number]],
        date: d.slice(0, 10),
        time: d.slice(11, 16),
        status: 'published',
        type: 'post',
        format: (rec.format as IPost['format']) || 'post',
        likes: 0,
        comments: 0,
        shares: 0,
        media: rec.media,
        remoteRefs: [{ platform: rec.platform as IPost['platforms'][number], accountId: rec.accountId, remoteId: rec.remoteId, url: rec.url }],
      });
    }
  } catch (e) {
    console.warn('[posts/list] published-ledger merge failed:', (e as Error).message);
  }

  // Group cross-posted content: the same caption published the same day to
  // multiple platforms becomes ONE row with all its platforms + remoteRefs,
  // so the Platforms column is consistent (always shows every platform a post
  // went to) instead of splitting into one row per platform.
  const groups = new Map<string, IPost>();
  for (const p of posts) {
    const caption = (p.content || '').trim();
    // Only group real cross-posted captions. Stories / captionless posts get a
    // unique key (their id) so they never merge into a single row.
    const groupable = caption && caption !== '(story)' && caption !== '(no caption)' && p.format !== 'story';
    const key = groupable ? `${p.date}|${caption.slice(0, 120)}` : `id:${p.id}`;
    const existing = groups.get(key);
    if (existing) {
      for (const pl of p.platforms) if (!existing.platforms.includes(pl)) existing.platforms.push(pl);
      existing.remoteRefs = [...(existing.remoteRefs ?? []), ...(p.remoteRefs ?? [])];
      existing.likes = (existing.likes ?? 0) + (p.likes ?? 0);
      existing.comments = (existing.comments ?? 0) + (p.comments ?? 0);
      existing.shares = (existing.shares ?? 0) + (p.shares ?? 0);
      if (!existing.media?.length && p.media?.length) existing.media = p.media;
      if ((!existing.format || existing.format === 'post') && p.format && p.format !== 'post') existing.format = p.format;
    } else {
      groups.set(key, { ...p, platforms: [...p.platforms] });
    }
  }
  const merged = [...groups.values()].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return merged;
}
