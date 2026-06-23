import { NextResponse } from 'next/server';
import { listAccounts, listHidden } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';
import { IPost } from '@/mock-server/posts';

// GET /api/posts/list — the real posts published on the connected Pages /
// Instagram accounts, mapped into the app's IPost shape with live counts.
export async function GET() {
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
      }
    } catch (e) {
      console.warn(`[posts/list] failed for ${acc.platform}:${acc.accountId}:`, (e as Error).message);
    }
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
  // Drop posts the user removed from the dashboard (e.g. Instagram, which can't
  // be deleted via API). A grouped row is hidden only if ALL its refs are hidden.
  const hidden = await listHidden();
  const visible = [...groups.values()].filter((p) => {
    const refs = p.remoteRefs ?? [];
    return !refs.length || !refs.every((r) => hidden.has(r.remoteId));
  });
  const merged = visible.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return NextResponse.json({ posts: merged });
}
