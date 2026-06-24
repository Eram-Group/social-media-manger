import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';
import { analyzeSentiment, executiveSummary } from '@/server/ai';

// GET /api/report?period=monthly|weekly
// The full client report: every real data point we can pull from Meta for the
// connected Facebook + Instagram accounts, plus AI sentiment over real comments
// and an AI executive summary.
export async function GET(req: NextRequest) {
  const period = new URL(req.url).searchParams.get('period') === 'weekly' ? 'weekly' : 'monthly';
  const days = period === 'weekly' ? 7 : 28;
  const accounts = await listAccounts();

  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 24 * 60 * 60;
  const num = (v: any) => Number(v) || 0;

  const platforms: any[] = [];
  const allComments: string[] = [];
  const topPosts: any[] = [];
  let igDemographics: any = null;

  for (const acc of accounts) {
    const block: any = { platform: acc.platform, name: acc.name, followers: acc.followers ?? 0, stats: {} };
    try {
      if (acc.platform === 'instagram') {
        const info = await graphGet<any>(acc.accountId, { access_token: acc.accessToken, fields: 'followers_count,media_count' });
        block.followers = info.followers_count ?? block.followers;
        block.mediaCount = info.media_count;
        // account insights (period day + range)
        try {
          const ins = await graphGet<any>(`${acc.accountId}/insights`, {
            access_token: acc.accessToken, period: 'day', metric_type: 'total_value', since: String(since), until: String(until),
            metric: 'reach,views,accounts_engaged,total_interactions,likes,comments,shares,saves,profile_views,website_clicks',
          });
          for (const m of ins.data ?? []) block.stats[m.name] = num(m.total_value?.value);
        } catch { /* needs scope */ }
        // demographics (once)
        if (!igDemographics) {
          try {
            const dem = await graphGet<any>(`${acc.accountId}/insights`, {
              access_token: acc.accessToken, metric: 'follower_demographics', period: 'lifetime', metric_type: 'total_value', breakdown: 'age,gender,country',
            });
            const rows = dem.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
            if (rows.length) {
              const age: Record<string, number> = {}, gender: Record<string, number> = {}, country: Record<string, number> = {};
              for (const row of rows) {
                const [a, g, c] = row.dimension_values;
                if (a) age[a] = (age[a] ?? 0) + row.value;
                if (g) gender[g] = (gender[g] ?? 0) + row.value;
                if (c) country[c] = (country[c] ?? 0) + row.value;
              }
              const arr = (o: Record<string, number>) => Object.entries(o).map(([label, value]) => ({ label, value }));
              const G: Record<string, string> = { M: 'Male', F: 'Female', U: 'Unknown' };
              igDemographics = {
                age: arr(age).sort((a, b) => a.label.localeCompare(b.label)),
                gender: arr(gender).map((x) => ({ ...x, label: G[x.label] ?? x.label })),
                countries: arr(country).sort((a, b) => b.value - a.value).slice(0, 8),
              };
            }
          } catch { /* needs 100 followers */ }
        }
        // recent media → top posts + comments
        const media = await graphGet<any>(`${acc.accountId}/media`, {
          access_token: acc.accessToken, fields: 'id,caption,permalink,like_count,comments_count,comments.limit(25){text}', limit: '25',
        });
        for (const m of media.data ?? []) {
          const eng = num(m.like_count) + num(m.comments_count);
          topPosts.push({ platform: 'instagram', content: m.caption ?? '(no caption)', permalink: m.permalink, likes: num(m.like_count), comments: num(m.comments_count), engagement: eng });
          for (const c of m.comments?.data ?? []) if (c.text) allComments.push(c.text);
        }
      } else if (acc.platform === 'facebook') {
        const info = await graphGet<any>(acc.accountId, { access_token: acc.accessToken, fields: 'followers_count,fan_count' });
        block.followers = info.followers_count ?? info.fan_count ?? block.followers;
        try {
          const ins = await graphGet<any>(`${acc.accountId}/insights`, {
            access_token: acc.accessToken, period: 'days_28',
            metric: 'page_post_engagements,page_views_total,page_video_views,page_daily_follows_unique',
          });
          const sum = (vals: any[]) => (vals ?? []).reduce((s, v) => s + num(v.value), 0);
          for (const m of ins.data ?? []) {
            if (m.name === 'page_post_engagements') block.stats.engagements = sum(m.values);
            if (m.name === 'page_views_total') block.stats.pageViews = sum(m.values);
            if (m.name === 'page_video_views') block.stats.videoViews = sum(m.values);
            if (m.name === 'page_daily_follows_unique') block.stats.newFollows = sum(m.values);
          }
        } catch { /* */ }
        const r = await graphGet<any>(`${acc.accountId}/posts`, {
          access_token: acc.accessToken, limit: '25',
          fields: 'id,message,permalink_url,shares,likes.summary(true).limit(0),comments.summary(true).limit(0),comments.limit(25){message}',
        });
        for (const p of r.data ?? []) {
          const likes = num(p.likes?.summary?.total_count), comments = num(p.comments?.summary?.total_count), shares = num(p.shares?.count);
          topPosts.push({ platform: 'facebook', content: p.message ?? '(no caption)', permalink: p.permalink_url, likes, comments, shares, engagement: likes + comments + shares });
          for (const c of p.comments?.data ?? []) if (c.message) allComments.push(c.message);
        }
      }
    } catch (e) {
      block.error = (e as Error).message;
    }
    platforms.push(block);
  }

  // Aggregate summary.
  const totalFollowers = platforms.reduce((s, p) => s + num(p.followers), 0);
  const totalEngagement = topPosts.reduce((s, p) => s + num(p.engagement), 0);
  const totalReach = platforms.reduce((s, p) => s + num(p.stats?.reach), 0);
  topPosts.sort((a, b) => b.engagement - a.engagement);

  // AI sentiment over the real comments + executive summary.
  const sentiment = await analyzeSentiment(allComments);
  const summary = await executiveSummary({
    period, totalFollowers, totalReach, totalEngagement,
    posts: topPosts.length, comments: allComments.length,
    platforms: platforms.map((p) => ({ platform: p.platform, followers: p.followers, stats: p.stats })),
    sentiment: { positive: sentiment.positive, neutral: sentiment.neutral, negative: sentiment.negative },
  });

  return NextResponse.json({
    ok: true,
    period,
    rangeDays: days,
    summary: { totalFollowers, totalReach, totalEngagement, totalPosts: topPosts.length, totalComments: allComments.length },
    platforms,
    demographics: igDemographics,
    topPosts: topPosts.slice(0, 8),
    sentiment,
    executiveSummary: summary,
  });
}
