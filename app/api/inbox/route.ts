import { NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';

export interface InboxItem {
  id: string;
  platform: string;
  accountId: string;
  author: string;
  text: string;
  time: string;
  postId: string;
  postExcerpt?: string;
  permalink?: string;
}

// GET /api/inbox — real comments on the connected Pages' recent posts.
// (Replying requires the pages_manage_engagement permission, which isn't granted
// yet — so this is read-only for now, with a link to reply on the platform.)
export async function GET() {
  const accounts = await listAccounts();
  const items: InboxItem[] = [];

  for (const acc of accounts) {
    if (acc.platform !== 'facebook') continue;
    try {
      const r = await graphGet<{ data: any[] }>(`${acc.accountId}/posts`, {
        access_token: acc.accessToken,
        fields: 'id,message,permalink_url,comments.limit(25){id,from,message,created_time}',
        limit: '15',
      });
      for (const post of r.data ?? []) {
        const excerpt = (post.message ?? '').slice(0, 60);
        for (const c of post.comments?.data ?? []) {
          items.push({
            id: c.id,
            platform: 'facebook',
            accountId: acc.accountId,
            author: c.from?.name ?? 'Facebook user',
            text: c.message ?? '',
            time: c.created_time ?? '',
            postId: post.id,
            postExcerpt: excerpt,
            permalink: post.permalink_url,
          });
        }
      }
    } catch (e) {
      console.warn(`[inbox] failed for ${acc.accountId}:`, (e as Error).message);
    }
  }

  items.sort((a, b) => b.time.localeCompare(a.time));
  return NextResponse.json({ items });
}
