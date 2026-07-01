import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';
import { getOrgStats } from '@/server/connectors/linkedin';
import { getCached } from '@/server/cache';

// GET /api/metrics — derived audience/performance metrics per connected account,
// modeled on the URViral metric set: followers, engagement rate, avg views/likes/
// comments/(saves/shares), and top age/gender/country (Instagram demographics).
// Everything is computed from real Meta data.

const pct = (n: number) => Math.round(n * 10) / 10;
const avg = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0);
const topKey = (map: Record<string, number>) => {
  const entries = Object.entries(map);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const [label, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return { label, percentage: pct((value / total) * 100) };
};

async function facebookMetrics(acc: any) {
  const m: any = { platform: 'facebook', name: acc.name, followers_count: acc.followers ?? 0 };
  try {
    const info = await graphGet<any>(acc.accountId, { access_token: acc.accessToken, fields: 'followers_count,fan_count' });
    m.followers_count = info.followers_count ?? info.fan_count ?? m.followers_count;

    const r = await graphGet<{ data: any[] }>(`${acc.accountId}/posts`, {
      access_token: acc.accessToken,
      fields: 'id,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
      limit: '25',
    });
    const posts = r.data ?? [];
    const likes = posts.map((p) => p.likes?.summary?.total_count ?? 0);
    const comments = posts.map((p) => p.comments?.summary?.total_count ?? 0);
    const shares = posts.map((p) => p.shares?.count ?? 0);
    m.posts_analyzed = posts.length;
    m.avg_likes = Math.round(avg(likes));
    m.avg_comments = Math.round(avg(comments));
    m.avg_shares = Math.round(avg(shares));
    const totalEng = likes.reduce((s, n) => s + n, 0) + comments.reduce((s, n) => s + n, 0) + shares.reduce((s, n) => s + n, 0);
    m.engagement_rate_percentage = m.followers_count && posts.length ? pct((totalEng / posts.length / m.followers_count) * 100) : 0;
  } catch (e) {
    m.error = (e as Error).message;
  }
  return m;
}

async function linkedinMetrics(acc: any) {
  const m: any = { platform: 'linkedin', name: acc.name, followers_count: acc.followers ?? 0 };
  try {
    const stats = await getOrgStats(acc);
    if (typeof stats.followers === 'number') m.followers_count = stats.followers;
  } catch (e) {
    m.error = (e as Error).message;
  }
  return m;
}

async function instagramMetrics(acc: any) {
  const m: any = { platform: 'instagram', name: acc.name, followers_count: acc.followers ?? 0 };
  try {
    const info = await graphGet<any>(acc.accountId, { access_token: acc.accessToken, fields: 'followers_count,media_count' });
    m.followers_count = info.followers_count ?? m.followers_count;
    m.media_count = info.media_count;

    const media = await graphGet<{ data: any[] }>(`${acc.accountId}/media`, {
      access_token: acc.accessToken, fields: 'id,like_count,comments_count,media_type', limit: '25',
    });
    const items = media.data ?? [];
    m.posts_analyzed = items.length;
    m.avg_likes = Math.round(avg(items.map((p) => p.like_count ?? 0)));
    m.avg_comments = Math.round(avg(items.map((p) => p.comments_count ?? 0)));
    const totalEng = items.reduce((s, p) => s + (p.like_count ?? 0) + (p.comments_count ?? 0), 0);
    m.engagement_rate_percentage = m.followers_count && items.length ? pct((totalEng / items.length / m.followers_count) * 100) : 0;

    // Demographics → top age / gender / country.
    try {
      const dem = await graphGet<any>(`${acc.accountId}/insights`, {
        access_token: acc.accessToken, metric: 'follower_demographics', period: 'lifetime', metric_type: 'total_value', breakdown: 'age,gender,country',
      });
      const rows = dem.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      const age: Record<string, number> = {}, gender: Record<string, number> = {}, country: Record<string, number> = {};
      for (const row of rows) {
        const [a, g, c] = row.dimension_values;
        if (a) age[a] = (age[a] ?? 0) + row.value;
        if (g) gender[g] = (gender[g] ?? 0) + row.value;
        if (c) country[c] = (country[c] ?? 0) + row.value;
      }
      const G: Record<string, string> = { M: 'Male', F: 'Female', U: 'Unknown' };
      const ta = topKey(age), tg = topKey(gender), tc = topKey(country);
      if (ta) m.top_age_percentage = ta;
      if (tg) m.top_gender_percentage = { ...tg, label: G[tg.label] ?? tg.label };
      if (tc) m.top_country_percentage = tc;
    } catch { /* needs instagram_manage_insights + 100 followers */ }
  } catch (e) {
    m.error = (e as Error).message;
  }
  return m;
}

export async function GET(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const cached = await getCached('metrics', 30 * 60, computeMetrics, force);
  return NextResponse.json({ ok: true, ...cached.data, cachedAt: cached.cachedAt, fromCache: cached.fromCache });
}

async function computeMetrics() {
  const accounts = await listAccounts();
  const facebook = [];
  const instagram = [];
  const linkedin = [];
  for (const acc of accounts) {
    if (acc.platform === 'facebook') facebook.push(await facebookMetrics(acc));
    if (acc.platform === 'instagram') instagram.push(await instagramMetrics(acc));
    if (acc.platform === 'linkedin') linkedin.push(await linkedinMetrics(acc));
  }
  const all = [...facebook, ...instagram, ...linkedin];
  const general = {
    general_follower_count: all.reduce((s, m) => s + (m.followers_count ?? 0), 0),
    connected_accounts: all.length,
    avg_engagement_rate_percentage: pct(avg(all.map((m) => m.engagement_rate_percentage).filter((v): v is number => v != null))),
    total_avg_likes: all.reduce((s, m) => s + (m.avg_likes ?? 0), 0),
    total_avg_comments: all.reduce((s, m) => s + (m.avg_comments ?? 0), 0),
  };
  return { general, facebook, instagram, linkedin };
}
