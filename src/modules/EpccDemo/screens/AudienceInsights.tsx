'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, RefreshCw, AlertCircle } from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, PlatformChip, formatFollowers, ChartCard, ChartSkeleton, GENDER_COLORS } from '../_components/ui';
import { DonutChart, CategoryBarChart } from '../_components/charts';
import { useApi } from '../_services/useApi';

interface Dim { label: string; value: number }
interface IgView { accountId: string; name?: string; followers?: number | null; age: Dim[]; gender: Dim[]; countries: Dim[]; stats?: Record<string, number>; hasData?: boolean; error?: string }
interface FbView { accountId: string; name?: string; followers?: number | null; category?: string | null; link?: string | null; stats: { totalFollows?: number; newFollows28d?: number; engagements28d?: number; pageViews28d?: number; videoViews28d?: number; totalActions28d?: number }; reactions?: Record<string, number>; hasData?: boolean; error?: string }

export default function AudienceInsights() {
  const { data: raw, loading, refresh } = useApi<{ available: boolean; instagram: IgView[]; facebook: FbView[] }>('/api/audience');
  const data = raw ?? { available: false, instagram: [], facebook: [] };
  const [platform, setPlatform] = useState<'instagram' | 'facebook'>('instagram');
  const [idx, setIdx] = useState(0);
  const load = () => refresh();

  const igList = data.instagram ?? [];
  const fbList = data.facebook ?? [];
  // Default to whichever platform has accounts.
  useEffect(() => { if (igList.length === 0 && fbList.length > 0) setPlatform('facebook'); }, [igList.length, fbList.length]);
  const list = platform === 'instagram' ? igList : fbList;
  const view = list[idx] ?? list[0];
  const ig = platform === 'instagram' ? (view as IgView) : null;
  const fb = platform === 'facebook' ? (view as FbView) : null;

  const ageData = (ig?.age ?? []).map((d) => ({ label: d.label, value: d.value }));
  const genderData = (ig?.gender ?? []).map((d) => ({ label: d.label, value: d.value }));
  const countryData = (ig?.countries ?? []).slice(0, 8).map((d) => ({ label: d.label, value: d.value }));

  const tabs = useMemo(() => {
    const t: { key: 'instagram' | 'facebook'; count: number }[] = [];
    if (igList.length) t.push({ key: 'instagram', count: igList.length });
    if (fbList.length) t.push({ key: 'facebook', count: fbList.length });
    return t;
  }, [igList.length, fbList.length]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Audience Insights" subtitle="Real audience data from your connected accounts." />
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && !raw ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : !data.available ? (
        <DemoCard className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Users size={22} /></span>
          <div>
            <p className="font-Sora text-base font-semibold">Connect an account</p>
            <p className="mt-1 max-w-md text-sm text-neutral-500">Audience data comes from your connected Instagram and Facebook accounts.</p>
          </div>
          <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect an account →</a>
        </DemoCard>
      ) : (
        <>
          {/* platform tabs */}
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => { setPlatform(t.key); setIdx(0); }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm capitalize ${platform === t.key ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}>
                <PlatformChip platform={t.key} /> {t.key}
              </button>
            ))}
          </div>

          {/* account switcher */}
          {list.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {list.map((a, i) => (
                <button key={a.accountId} onClick={() => setIdx(i)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${i === idx ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}>
                  {a.name ?? a.accountId}
                </button>
              ))}
            </div>
          )}

          {view?.error ? (
            <DemoCard className="flex items-center gap-2 py-8 text-sm text-text-red">
              <AlertCircle size={16} /> Couldn’t load data: {view.error}. Reconnect the account to grant the insights permission.
            </DemoCard>
          ) : platform === 'instagram' && ig ? (
            <>
              {/* Account performance — last 28 days (all IG account metrics) */}
              {ig.stats && Object.keys(ig.stats).length > 0 && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Followers" value={ig.followers != null ? formatFollowers(ig.followers) : '—'} />
                  <StatCard label="Reach · 28d" value={formatFollowers(ig.stats.reach ?? 0)} />
                  <StatCard label="Views · 28d" value={formatFollowers(ig.stats.views ?? 0)} />
                  <StatCard label="Accounts engaged · 28d" value={formatFollowers(ig.stats.accounts_engaged ?? 0)} />
                  <StatCard label="Interactions · 28d" value={formatFollowers(ig.stats.total_interactions ?? 0)} />
                  <StatCard label="Profile views · 28d" value={formatFollowers(ig.stats.profile_views ?? 0)} />
                  <StatCard label="Website clicks · 28d" value={formatFollowers(ig.stats.website_clicks ?? 0)} />
                  <StatCard label="Link taps · 28d" value={formatFollowers(ig.stats.profile_links_taps ?? 0)} />
                </div>
              )}

              {!ig.hasData ? (
              <DemoCard className="py-10 text-center text-sm text-neutral-600">
                Demographic breakdowns (age / gender / country) appear once the account has <span className="font-medium">100+ followers</span> — the performance metrics above are live now.
              </DemoCard>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <StatCard label="Followers" value={ig.followers != null ? formatFollowers(ig.followers) : '—'} />
                  <StatCard label="Top age group" value={[...ig.age].sort((a, b) => b.value - a.value)[0]?.label ?? '—'} />
                  <StatCard label="Top country" value={ig.countries[0]?.label ?? '—'} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <ChartCard title="Age distribution" isEmpty={!ageData.length}>
                    <CategoryBarChart data={ageData} />
                  </ChartCard>
                  <ChartCard title="Gender" isEmpty={!genderData.length}>
                    <DonutChart data={genderData} colors={GENDER_COLORS} />
                  </ChartCard>
                  <ChartCard title="Top countries" isEmpty={!countryData.length}>
                    <CategoryBarChart data={countryData} horizontal />
                  </ChartCard>
                </div>
              </>
            )}
            </>
          ) : platform === 'facebook' && fb ? (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Followers" value={fb.followers != null ? formatFollowers(fb.followers) : '—'} />
                <StatCard label="New follows · 28d" value={formatFollowers(fb.stats.newFollows28d ?? 0)} />
                <StatCard label="Page views · 28d" value={formatFollowers(fb.stats.pageViews28d ?? 0)} />
                <StatCard label="Engagements · 28d" value={formatFollowers(fb.stats.engagements28d ?? 0)} />
                <StatCard label="Video views · 28d" value={formatFollowers(fb.stats.videoViews28d ?? 0)} />
                <StatCard label="Total actions · 28d" value={formatFollowers(fb.stats.totalActions28d ?? 0)} />
                {fb.category && <StatCard label="Category" value={fb.category} />}
              </div>

              {fb.reactions && Object.keys(fb.reactions).length > 0 && (
                <DemoCard>
                  <SectionTitle title="Reactions · last 28 days" subtitle="By type, across the Page" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(fb.reactions).filter(([, n]) => n > 0).map(([k, n]) => (
                      <span key={k} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700">
                        <span className="capitalize">{k}</span> <span className="font-semibold">{formatFollowers(n)}</span>
                      </span>
                    ))}
                  </div>
                </DemoCard>
              )}

              <DemoCard className="flex items-start gap-3 py-5 text-sm text-neutral-600">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-neutral-400" />
                <p>These are all the Page metrics the Facebook Graph API still exposes. Audience demographics (age, gender, country) were removed by Meta for Facebook Pages — use the Instagram tab for demographic breakdowns.{fb.link ? <> · <a href={fb.link} target="_blank" rel="noreferrer" className="font-medium text-primary-800 hover:underline">Open Page</a></> : null}</p>
              </DemoCard>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
