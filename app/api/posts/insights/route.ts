import { NextRequest, NextResponse } from 'next/server';
import { findAccount } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';

// GET /api/posts/insights?platform=facebook&accountId=...&remoteId=...
// Returns real engagement for a published post (likes/comments/shares, and
// reach/impressions when the platform still exposes them).
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
      const node = await graphGet<any>(remoteId, {
        access_token: token,
        fields: 'permalink_url,created_time,message,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
      });
      const metrics: Record<string, number> = {
        likes: node?.likes?.summary?.total_count ?? 0,
        comments: node?.comments?.summary?.total_count ?? 0,
        shares: node?.shares?.count ?? 0,
      };
      // Reach/impressions are best-effort — metric names change and may be unavailable.
      try {
        const ins = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(`${remoteId}/insights`, {
          access_token: token,
          metric: 'post_impressions,post_impressions_unique,post_engaged_users',
        });
        for (const m of ins.data ?? []) {
          const v = m.values?.[0]?.value ?? 0;
          if (m.name === 'post_impressions') metrics.impressions = v;
          if (m.name === 'post_impressions_unique') metrics.reach = v;
          if (m.name === 'post_engaged_users') metrics.engagedUsers = v;
        }
      } catch {
        /* insights metric unavailable — keep engagement counts only */
      }
      return NextResponse.json({
        ok: true,
        platform,
        metrics,
        permalink: node?.permalink_url,
        message: node?.message,
        createdTime: node?.created_time,
      });
    }

    if (platform === 'instagram') {
      const node = await graphGet<any>(remoteId, {
        access_token: token,
        fields: 'like_count,comments_count,permalink,caption,timestamp',
      });
      const metrics: Record<string, number> = {
        likes: node?.like_count ?? 0,
        comments: node?.comments_count ?? 0,
      };
      try {
        const ins = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(`${remoteId}/insights`, {
          access_token: token,
          metric: 'reach,impressions',
        });
        for (const m of ins.data ?? []) {
          const v = m.values?.[0]?.value ?? 0;
          if (m.name === 'reach') metrics.reach = v;
          if (m.name === 'impressions') metrics.impressions = v;
        }
      } catch {
        /* ignore */
      }
      return NextResponse.json({
        ok: true,
        platform,
        metrics,
        permalink: node?.permalink,
        message: node?.caption,
        createdTime: node?.timestamp,
      });
    }

    return NextResponse.json({ error: `Insights not supported for ${platform}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
