import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';
import { getOrgStats } from '@/server/connectors/linkedin';
import { getCached } from '@/server/cache';

// GET /api/overview — the richest real snapshot the Graph API still allows:
//   • daily follower growth (adds − removes → net) over the last 28 days
//   • 28-day totals: engagements, page views, video views, video watch-time
//   • reactions breakdown, content-type mix, top posts
//   • best-time-to-post HEATMAP computed from your real posts' engagement
//   • Instagram 28-day performance
// Cached 30 min (?refresh=1 to force). Only uses metrics verified live as working
// (Meta deprecated impressions + Facebook page demographics).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const period = url.searchParams.get('period') === 'weekly' ? 'weekly' : 'monthly';
  const force = url.searchParams.get('refresh') === '1';
  const days = period === 'weekly' ? 7 : 28;
  const cached = await getCached(`overview:${period}`, 30 * 60, () => computeOverview(days), force);
  return NextResponse.json({ ...cached.data, period, rangeDays: days, cachedAt: cached.cachedAt, fromCache: cached.fromCache });
}

// KSA is UTC+3; bucket post times into local hours so "best time" is meaningful.
const KSA_OFFSET_H = 3;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface PostPoint { ts: number; eng: number; platform: string }

function buildBestTimes(points: PostPoint[]) {
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, eng: 0, posts: 0 }));
  const byDay = DAY_LABELS.map((label, d) => ({ day: d, label, eng: 0, posts: 0 }));
  // heat[day][hour] = total engagement
  const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const p of points) {
    const local = new Date((p.ts + KSA_OFFSET_H * 3600) * 1000);
    const d = local.getUTCDay();
    const h = local.getUTCHours();
    byHour[h].eng += p.eng; byHour[h].posts += 1;
    byDay[d].eng += p.eng; byDay[d].posts += 1;
    heat[d][h] += p.eng;
  }
  // Recommended slot = the (day,hour) with the highest engagement, else most posts.
  let best = { day: -1, hour: -1, eng: -1 };
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) {
    if (heat[d][h] > best.eng) best = { day: d, hour: h, eng: heat[d][h] };
  }
  const recommended = best.day >= 0 && best.eng > 0
    ? { day: DAY_LABELS[best.day], hour: best.hour, label: `${DAY_LABELS[best.day]} ${String(best.hour).padStart(2, '0')}:00` }
    : null;
  return { byHour, byDay, heat, recommended, sampleSize: points.length };
}

async function facebookOverview(acc: any, points: PostPoint[], since: number, until: number) {
  const token = acc.accessToken;
  const view: any = {
    accountId: acc.accountId, name: acc.name, platform: 'facebook',
    followers: acc.followers ?? null, category: null, link: null, talkingAbout: null,
    growth: [], daily: [], totals: {}, reactions: {}, topPosts: [], contentMix: [],
  };
  try {
    const info = await graphGet<any>(acc.accountId, {
      access_token: token, fields: 'followers_count,fan_count,category,link,talking_about_count',
    });
    view.followers = info.followers_count ?? info.fan_count ?? view.followers;
    view.category = info.category ?? null;
    view.link = info.link ?? null;
    view.talkingAbout = info.talking_about_count ?? null;
  } catch (e) { view.infoError = (e as Error).message; }

  // Daily series + 28-day totals (only live metrics).
  try {
    const ins = await graphGet<{ data: { name: string; values: { value: any; end_time?: string }[] }[] }>(`${acc.accountId}/insights`, {
      access_token: token,
      metric: 'page_daily_follows_unique,page_daily_unfollows_unique,page_post_engagements,page_views_total,page_video_views,page_video_view_time,page_total_actions,page_actions_post_reactions_total',
      period: 'day', since: String(since), until: String(until),
    });
    const series: Record<string, { value: any; end_time?: string }[]> = {};
    for (const m of ins.data ?? []) series[m.name] = m.values ?? [];
    const num = (v: any) => Number(v) || 0;
    const sum = (vals?: { value: any }[]) => (vals ?? []).reduce((s, v) => s + num(v.value), 0);

    const adds = series.page_daily_follows_unique ?? [];
    const removes = series.page_daily_unfollows_unique ?? [];
    view.growth = adds.map((a, i) => {
      const date = (a.end_time ?? '').slice(0, 10);
      const add = num(a.value);
      const rem = num(removes[i]?.value);
      return { date, adds: add, removes: rem, net: add - rem };
    });

    const eng = series.page_post_engagements ?? [];
    const pv = series.page_views_total ?? [];
    const vv = series.page_video_views ?? [];
    view.daily = (series.page_daily_follows_unique ?? []).map((a, i) => ({
      date: (a.end_time ?? '').slice(0, 10),
      engagements: Number(eng[i]?.value ?? 0),
      pageViews: Number(pv[i]?.value ?? 0),
      videoViews: Number(vv[i]?.value ?? 0),
    }));

    view.totals = {
      newFollows28d: sum(adds),
      unfollows28d: sum(removes),
      netFollows28d: sum(adds) - sum(removes),
      engagements28d: sum(series.page_post_engagements),
      pageViews28d: sum(series.page_views_total),
      videoViews28d: sum(series.page_video_views),
      videoWatchTimeSec: Math.round(sum(series.page_video_view_time) / 1000), // ms → s
      totalActions28d: sum(series.page_total_actions),
    };

    // Reactions: value is an object {like, love, ...} per day — sum across days.
    for (const day of series.page_actions_post_reactions_total ?? []) {
      const obj = day.value;
      if (obj && typeof obj === 'object') for (const [k, n] of Object.entries(obj)) view.reactions[k] = (view.reactions[k] ?? 0) + num(n);
    }
  } catch (e) { view.statsError = (e as Error).message; }

  // Posts → top posts, content mix, and best-time data points.
  try {
    const feed = await graphGet<{ data: any[] }>(`${acc.accountId}/posts`, {
      access_token: token,
      fields: 'id,created_time,message,permalink_url,status_type,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
      limit: '50',
    });
    const posts = (feed.data ?? []).map((p) => {
      const likes = p.likes?.summary?.total_count ?? 0;
      const comments = p.comments?.summary?.total_count ?? 0;
      const shares = p.shares?.count ?? 0;
      const eng = likes + comments + shares;
      const ts = Math.floor(new Date(p.created_time).getTime() / 1000);
      points.push({ ts, eng, platform: 'facebook' });
      return { id: p.id, createdTime: p.created_time, message: (p.message ?? '').slice(0, 140), permalink: p.permalink_url, statusType: p.status_type, likes, comments, shares, eng };
    });
    view.topPosts = [...posts].sort((a, b) => b.eng - a.eng).slice(0, 6);
    const mix: Record<string, number> = {};
    const TYPE: Record<string, string> = { added_photos: 'Photo', added_video: 'Video', shared_story: 'Link/Share', mobile_status_update: 'Text', created_note: 'Note' };
    for (const p of posts) { const k = TYPE[p.statusType] ?? (p.statusType || 'Other'); mix[k] = (mix[k] ?? 0) + 1; }
    view.contentMix = Object.entries(mix).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    view.postCount = posts.length;
  } catch (e) { view.postsError = (e as Error).message; }

  return view;
}

async function linkedinOverview(acc: any) {
  const view: any = {
    accountId: acc.accountId, name: acc.name, platform: 'linkedin',
    followers: acc.followers ?? null,
  };
  try {
    const stats = await getOrgStats(acc);
    if (typeof stats.followers === 'number') view.followers = stats.followers;
  } catch (e) { view.statsError = (e as Error).message; }
  return view;
}

async function instagramOverview(acc: any, points: PostPoint[], since: number, until: number) {
  const token = acc.accessToken;
  const view: any = { accountId: acc.accountId, name: acc.name, platform: 'instagram', followers: acc.followers ?? null, stats: {} };
  try {
    const ins = await graphGet<{ data: { name: string; total_value?: { value: number } }[] }>(`${acc.accountId}/insights`, {
      access_token: token,
      metric: 'reach,views,accounts_engaged,total_interactions,likes,comments,shares,saves,profile_views,website_clicks,profile_links_taps',
      period: 'day', metric_type: 'total_value', since: String(since), until: String(until),
    });
    for (const m of ins.data ?? []) view.stats[m.name] = m.total_value?.value ?? 0;
  } catch (e) { view.statsError = (e as Error).message; }

  // Media → best-time data points + recent grid.
  try {
    const media = await graphGet<{ data: any[] }>(`${acc.accountId}/media`, {
      access_token: token, fields: 'id,timestamp,like_count,comments_count,media_type,permalink,caption', limit: '50',
    });
    view.media = (media.data ?? []).map((p) => {
      const eng = (p.like_count ?? 0) + (p.comments_count ?? 0);
      const ts = Math.floor(new Date(p.timestamp).getTime() / 1000);
      points.push({ ts, eng, platform: 'instagram' });
      return { id: p.id, timestamp: p.timestamp, likes: p.like_count ?? 0, comments: p.comments_count ?? 0, type: p.media_type, permalink: p.permalink, eng };
    });
    view.mediaCount = view.media.length;
  } catch (e) { view.mediaError = (e as Error).message; }

  return view;
}

async function computeOverview(days: number) {
  const accounts = await listAccounts();
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;
  const points: PostPoint[] = [];
  const facebook = [];
  const instagram = [];
  const linkedin = [];
  for (const acc of accounts) {
    if (acc.platform === 'facebook') facebook.push(await facebookOverview(acc, points, since, until));
    if (acc.platform === 'instagram') instagram.push(await instagramOverview(acc, points, since, until));
    if (acc.platform === 'linkedin') linkedin.push(await linkedinOverview(acc));
  }
  if (!facebook.length && !instagram.length && !linkedin.length) {
    return { ok: true, available: false, facebook: [], instagram: [], linkedin: [], bestTimes: null };
  }
  return { ok: true, available: true, facebook, instagram, linkedin, bestTimes: buildBestTimes(points) };
}
