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
      // Some objects (e.g. stories) reject the singular node fields query — don't
      // let that fail the whole request; fall back to empty counts.
      let node: any = {};
      try {
        node = await graphGet<any>(remoteId, {
          access_token: token,
          fields: 'permalink_url,created_time,message,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
        });
      } catch (e) {
        if (!/#12|deprecated|nonexisting field|Unsupported/i.test((e as Error).message)) throw e;
      }
      const metrics: Record<string, number> = {
        likes: node?.likes?.summary?.total_count ?? 0,
        comments: node?.comments?.summary?.total_count ?? 0,
        shares: node?.shares?.count ?? 0,
      };
      const reactions: Record<string, number> = {};
      const breakdowns: Record<string, Record<string, number>> = {};
      // Every post insight Meta still exposes (reach/impressions were removed).
      try {
        const ins = await graphGet<{ data: { name: string; values: { value: any }[] }[] }>(`${remoteId}/insights`, {
          access_token: token,
          metric: 'post_reactions_by_type_total,post_clicks,post_clicks_by_type,post_video_views,post_video_views_organic,post_video_avg_time_watched,post_activity_by_action_type',
        });
        for (const m of ins.data ?? []) {
          const v = m.values?.[0]?.value;
          if (m.name === 'post_clicks') metrics.clicks = Number(v) || 0;
          if (m.name === 'post_video_views') metrics.videoViews = Number(v) || 0;
          if (m.name === 'post_video_views_organic') metrics.videoViewsOrganic = Number(v) || 0;
          if (m.name === 'post_video_avg_time_watched') metrics.avgWatchMs = Number(v) || 0;
          if (m.name === 'post_reactions_by_type_total' && v && typeof v === 'object') Object.assign(reactions, v);
          if (m.name === 'post_clicks_by_type' && v && typeof v === 'object') breakdowns.clicksByType = v;
          if (m.name === 'post_activity_by_action_type' && v && typeof v === 'object') breakdowns.activity = v;
        }
      } catch {
        /* insights unavailable — keep engagement counts only */
      }
      return NextResponse.json({
        ok: true,
        platform,
        metrics,
        reactions,
        breakdowns,
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
      // Working IG media metrics (per the URViral reference, v22.0): saved, views,
      // shares, likes, comments. (reach/impressions were deprecated for media.)
      try {
        const ins = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(`${remoteId}/insights`, {
          access_token: token,
          metric: 'saved,views,shares,likes,comments',
        });
        for (const m of ins.data ?? []) {
          const v = m.values?.[0]?.value ?? 0;
          if (m.name === 'saved') metrics.saved = v;
          if (m.name === 'views') metrics.views = v;
          if (m.name === 'shares') metrics.shares = v;
          if (m.name === 'likes' && !metrics.likes) metrics.likes = v;
          if (m.name === 'comments' && !metrics.comments) metrics.comments = v;
        }
      } catch {
        /* insights need instagram_manage_insights — reconnect to grant it */
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
