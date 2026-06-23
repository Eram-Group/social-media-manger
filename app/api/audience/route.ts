import { NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';

// GET /api/audience
//  - Instagram: real follower demographics (age / gender / country) via
//    follower_demographics (total_value, lifetime) — the URViral pattern.
//  - Facebook: Page audience stats (followers, new follows, page views,
//    engagement). NOTE: Facebook Page demographics (age/gender/country) were
//    removed from the Graph API, so only these aggregate stats are available.
export async function GET() {
  const accounts = await listAccounts();
  const ig = accounts.filter((a) => a.platform === 'instagram');
  const fb = accounts.filter((a) => a.platform === 'facebook');

  if (!ig.length && !fb.length) {
    return NextResponse.json({ ok: true, available: false, reason: 'none', instagram: [], facebook: [] });
  }

  // ---- Instagram demographics ----
  const instagram = [];
  for (const acc of ig) {
    const view: any = { accountId: acc.accountId, name: acc.name, followers: acc.followers ?? null, age: [], gender: [], countries: [] };
    try {
      const r = await graphGet<{ data: { total_value?: { breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } }[] }>(
        `${acc.accountId}/insights`,
        { access_token: acc.accessToken, metric: 'follower_demographics', period: 'lifetime', metric_type: 'total_value', breakdown: 'age,gender,country' },
      );
      const rows = r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      const ageMap: Record<string, number> = {}, genderMap: Record<string, number> = {}, countryMap: Record<string, number> = {};
      for (const row of rows) {
        const [age, gender, country] = row.dimension_values;
        if (age) ageMap[age] = (ageMap[age] ?? 0) + row.value;
        if (gender) genderMap[gender] = (genderMap[gender] ?? 0) + row.value;
        if (country) countryMap[country] = (countryMap[country] ?? 0) + row.value;
      }
      const toArr = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => ({ label: k, value: v }));
      const G: Record<string, string> = { M: 'Male', F: 'Female', U: 'Unknown' };
      view.age = toArr(ageMap).sort((a, b) => a.label.localeCompare(b.label));
      view.gender = toArr(genderMap).map((g) => ({ label: G[g.label] ?? g.label, value: g.value }));
      view.countries = toArr(countryMap).sort((a, b) => b.value - a.value).slice(0, 8);
      view.hasData = rows.length > 0;
    } catch (e) {
      view.error = (e as Error).message;
    }
    instagram.push(view);
  }

  // ---- Facebook page stats ----
  const facebook = [];
  for (const acc of fb) {
    const view: any = { accountId: acc.accountId, name: acc.name, followers: acc.followers ?? null, stats: {} };
    try {
      const info = await graphGet<{ followers_count?: number; fan_count?: number }>(acc.accountId, {
        access_token: acc.accessToken, fields: 'followers_count,fan_count',
      });
      view.followers = info.followers_count ?? info.fan_count ?? view.followers;

      const ins = await graphGet<{ data: { name: string; values: { value: number }[] }[] }>(`${acc.accountId}/insights`, {
        access_token: acc.accessToken,
        metric: 'page_follows,page_daily_follows_unique,page_post_engagements,page_views_total',
        period: 'days_28',
      });
      const sum = (vals: { value: number }[]) => vals.reduce((s, v) => s + (Number(v.value) || 0), 0);
      const last = (vals: { value: number }[]) => Number(vals[vals.length - 1]?.value) || 0;
      for (const m of ins.data ?? []) {
        if (m.name === 'page_follows') view.stats.totalFollows = last(m.values);
        if (m.name === 'page_daily_follows_unique') view.stats.newFollows28d = sum(m.values);
        if (m.name === 'page_post_engagements') view.stats.engagements28d = sum(m.values);
        if (m.name === 'page_views_total') view.stats.pageViews28d = sum(m.values);
      }
      view.hasData = true;
    } catch (e) {
      view.error = (e as Error).message;
    }
    facebook.push(view);
  }

  return NextResponse.json({ ok: true, available: true, instagram, facebook });
}
