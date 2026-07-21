import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';
import { getCached } from '@/server/cache';

export interface InboxReply {
  id: string;
  author: string;
  text: string;
  time: string;
  fromPage?: boolean;
}

export interface InboxItem {
  id: string;
  platform: string;
  accountId: string;
  author: string;
  text: string;
  time: string;
  likeCount?: number;
  postId: string;
  postExcerpt?: string;
  permalink?: string;
  replies: InboxReply[];
}

// Surfaced to the client so a broken/expired token is visible instead of
// looking identical to "this account simply has no comments".
export interface InboxError {
  platform: string;
  accountId: string;
  accountName?: string;
  message: string;
}

interface InboxResult {
  items: InboxItem[];
  errors: InboxError[];
}

// GET /api/inbox — real comments on the connected Pages' recent posts.
// (Replying requires the pages_manage_engagement permission, which isn't granted
// yet — so this is read-only for now, with a link to reply on the platform.)
export async function GET(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const cached = await getCached('inbox', 10 * 60, fetchInbox, force);
  return NextResponse.json({
    items: cached.data.items,
    errors: cached.data.errors,
    cachedAt: cached.cachedAt,
    fromCache: cached.fromCache,
  });
}

async function fetchInbox(): Promise<InboxResult> {
  const accounts = await listAccounts();
  const items: InboxItem[] = [];
  const errors: InboxError[] = [];

  for (const acc of accounts) {
    // Instagram comments come from each media's /comments edge.
    if (acc.platform === 'instagram') {
      try {
        const media = await graphGet<{ data: any[] }>(`${acc.accountId}/media`, {
          access_token: acc.accessToken,
          fields: 'id,caption,permalink,comments.limit(50){id,username,text,timestamp,replies{id,username,text,timestamp}}',
          limit: '25',
        });
        for (const m of media.data ?? []) {
          const excerpt = (m.caption ?? '').slice(0, 60);
          for (const c of m.comments?.data ?? []) {
            const replies: InboxReply[] = (c.replies?.data ?? []).map((rep: any) => ({
              id: rep.id,
              author: rep.username ?? 'User',
              text: rep.text ?? '',
              time: rep.timestamp ?? '',
              fromPage: rep.username && acc.name ? `@${rep.username}` === acc.name : false,
            }));
            items.push({
              id: c.id,
              platform: 'instagram',
              accountId: acc.accountId,
              author: c.username ?? 'Instagram user',
              text: c.text ?? '',
              time: c.timestamp ?? '',
              likeCount: 0,
              postId: m.id,
              postExcerpt: excerpt,
              permalink: m.permalink,
              replies,
            });
          }
        }
      } catch (e) {
        const message = (e as Error).message;
        console.warn(`[inbox] IG failed for ${acc.accountId}:`, message);
        errors.push({ platform: 'instagram', accountId: acc.accountId, accountName: acc.name, message });
      }
      continue;
    }
    if (acc.platform !== 'facebook') continue;
    try {
      const r = await graphGet<{ data: any[] }>(`${acc.accountId}/posts`, {
        access_token: acc.accessToken,
        fields: 'id,message,permalink_url,comments.limit(50){id,from,message,created_time,like_count,comments.limit(25){id,from,message,created_time}}',
        limit: '20',
      });
      for (const post of r.data ?? []) {
        const excerpt = (post.message ?? '').slice(0, 60);
        for (const c of post.comments?.data ?? []) {
          const replies: InboxReply[] = (c.comments?.data ?? []).map((rep: any) => ({
            id: rep.id,
            author: rep.from?.name ?? 'User',
            text: rep.message ?? '',
            time: rep.created_time ?? '',
            fromPage: rep.from?.id === acc.accountId,
          }));
          items.push({
            id: c.id,
            platform: 'facebook',
            accountId: acc.accountId,
            author: c.from?.name ?? 'Facebook user',
            text: c.message ?? '',
            time: c.created_time ?? '',
            likeCount: c.like_count ?? 0,
            postId: post.id,
            postExcerpt: excerpt,
            permalink: post.permalink_url,
            replies,
          });
        }
      }
    } catch (e) {
      const message = (e as Error).message;
      console.warn(`[inbox] failed for ${acc.accountId}:`, message);
      errors.push({ platform: acc.platform, accountId: acc.accountId, accountName: acc.name, message });
    }
  }

  items.sort((a, b) => b.time.localeCompare(a.time));
  return { items, errors };
}
