import { NextRequest, NextResponse } from 'next/server';
import { findAccount } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';

// GET /api/posts/comments?platform=&accountId=&remoteId=
// Fetches comments (+ replies) for ONE specific post/media — reliable regardless
// of how recent the post is (the inbox aggregate only covers recent posts).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || '';
  const accountId = url.searchParams.get('accountId') || '';
  const remoteId = url.searchParams.get('remoteId') || '';
  if (!platform || !accountId || !remoteId) {
    return NextResponse.json({ error: 'platform, accountId and remoteId are required' }, { status: 400 });
  }

  const account = await findAccount(platform, accountId);
  if (!account) return NextResponse.json({ error: 'Account not connected' }, { status: 404 });
  const token = account.accessToken;

  try {
    if (platform === 'facebook') {
      const r = await graphGet<{ data: any[] }>(`${remoteId}/comments`, {
        access_token: token,
        fields: 'id,from,message,created_time,like_count,comments.limit(25){id,from,message,created_time}',
        limit: '100',
      });
      const comments = (r.data ?? []).map((c) => ({
        id: c.id,
        author: c.from?.name ?? 'Facebook user',
        text: c.message ?? '',
        time: c.created_time ?? '',
        likeCount: c.like_count ?? 0,
        replies: (c.comments?.data ?? []).map((rep: any) => ({
          id: rep.id, author: rep.from?.name ?? 'User', text: rep.message ?? '', time: rep.created_time ?? '',
          fromPage: rep.from?.id === accountId,
        })),
      }));
      return NextResponse.json({ ok: true, platform, comments });
    }

    if (platform === 'instagram') {
      const r = await graphGet<{ data: any[] }>(`${remoteId}/comments`, {
        access_token: token,
        fields: 'id,username,text,timestamp,like_count,replies{id,username,text,timestamp}',
        limit: '100',
      });
      const comments = (r.data ?? []).map((c) => ({
        id: c.id,
        author: c.username ?? 'Instagram user',
        text: c.text ?? '',
        time: c.timestamp ?? '',
        likeCount: c.like_count ?? 0,
        replies: (c.replies?.data ?? []).map((rep: any) => ({
          id: rep.id, author: rep.username ?? 'User', text: rep.text ?? '', time: rep.timestamp ?? '',
          fromPage: account.name ? `@${rep.username}` === account.name : false,
        })),
      }));
      return NextResponse.json({ ok: true, platform, comments });
    }

    return NextResponse.json({ error: `Comments not supported for ${platform}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
