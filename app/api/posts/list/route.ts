import { NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
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
          fields: 'id,message,created_time,permalink_url,full_picture,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
          limit: '50',
        });
        for (const p of r.data ?? []) {
          posts.push({
            id: p.id,
            content: p.message ?? '(no caption)',
            platforms: ['facebook'],
            date: (p.created_time ?? '').slice(0, 10),
            time: (p.created_time ?? '').slice(11, 16),
            status: 'published',
            type: 'post',
            likes: p.likes?.summary?.total_count ?? 0,
            comments: p.comments?.summary?.total_count ?? 0,
            shares: p.shares?.count ?? 0,
            media: p.full_picture ? [p.full_picture] : undefined,
            remoteRefs: [{ platform: 'facebook', accountId: acc.accountId, remoteId: p.id, url: p.permalink_url }],
          });
        }
      } else if (acc.platform === 'instagram') {
        const r = await graphGet<{ data: any[] }>(`${acc.accountId}/media`, {
          access_token: acc.accessToken,
          fields: 'id,caption,timestamp,permalink,media_url,like_count,comments_count',
          limit: '50',
        });
        for (const p of r.data ?? []) {
          posts.push({
            id: p.id,
            content: p.caption ?? '(no caption)',
            platforms: ['instagram'],
            date: (p.timestamp ?? '').slice(0, 10),
            time: (p.timestamp ?? '').slice(11, 16),
            status: 'published',
            type: 'post',
            likes: p.like_count ?? 0,
            comments: p.comments_count ?? 0,
            media: p.media_url ? [p.media_url] : undefined,
            remoteRefs: [{ platform: 'instagram', accountId: acc.accountId, remoteId: p.id, url: p.permalink }],
          });
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
    const key = `${p.date}|${(p.content || '').trim().slice(0, 120)}`;
    const existing = groups.get(key);
    if (existing) {
      for (const pl of p.platforms) if (!existing.platforms.includes(pl)) existing.platforms.push(pl);
      existing.remoteRefs = [...(existing.remoteRefs ?? []), ...(p.remoteRefs ?? [])];
      existing.likes = (existing.likes ?? 0) + (p.likes ?? 0);
      existing.comments = (existing.comments ?? 0) + (p.comments ?? 0);
      existing.shares = (existing.shares ?? 0) + (p.shares ?? 0);
      if (!existing.media?.length && p.media?.length) existing.media = p.media;
    } else {
      groups.set(key, { ...p, platforms: [...p.platforms] });
    }
  }
  const merged = [...groups.values()].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return NextResponse.json({ posts: merged });
}
