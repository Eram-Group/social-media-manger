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

  // Newest first.
  posts.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return NextResponse.json({ posts });
}
