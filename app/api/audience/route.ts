import { NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphGet } from '@/server/connectors/meta';

// GET /api/audience — real Instagram follower demographics (age / gender / country).
// Uses follower_demographics (total_value, lifetime) with breakdowns — the pattern
// proven in the URViral connectors. Needs the instagram_manage_insights scope.
//
// Note: Facebook Page audience demographics were removed from the Graph API, so
// only Instagram demographics are available.
export async function GET() {
  const accounts = await listAccounts();
  const igAccounts = accounts.filter((a) => a.platform === 'instagram');

  if (!igAccounts.length) {
    return NextResponse.json({ ok: true, available: false, reason: 'no_instagram', accounts: [] });
  }

  const results = [];
  for (const acc of igAccounts) {
    const view: any = { accountId: acc.accountId, name: acc.name, followers: acc.followers ?? null, age: [], gender: [], countries: [] };
    try {
      const r = await graphGet<{ data: { total_value?: { breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } }[] }>(
        `${acc.accountId}/insights`,
        {
          access_token: acc.accessToken,
          metric: 'follower_demographics',
          period: 'lifetime',
          metric_type: 'total_value',
          breakdown: 'age,gender,country',
        },
      );
      const rows = r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      // Each row: dimension_values = [age, gender, country], value = count.
      const ageMap: Record<string, number> = {};
      const genderMap: Record<string, number> = {};
      const countryMap: Record<string, number> = {};
      for (const row of rows) {
        const [age, gender, country] = row.dimension_values;
        if (age) ageMap[age] = (ageMap[age] ?? 0) + row.value;
        if (gender) genderMap[gender] = (genderMap[gender] ?? 0) + row.value;
        if (country) countryMap[country] = (countryMap[country] ?? 0) + row.value;
      }
      const sortNum = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => ({ label: k, value: v }));
      view.age = sortNum(ageMap).sort((a, b) => a.label.localeCompare(b.label));
      const G: Record<string, string> = { M: 'Male', F: 'Female', U: 'Unknown' };
      view.gender = sortNum(genderMap).map((g) => ({ label: G[g.label] ?? g.label, value: g.value }));
      view.countries = sortNum(countryMap).sort((a, b) => b.value - a.value).slice(0, 8);
      view.hasData = rows.length > 0;
    } catch (e) {
      view.error = (e as Error).message;
    }
    results.push(view);
  }

  return NextResponse.json({ ok: true, available: true, accounts: results });
}
