'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Users, RefreshCw, AlertCircle } from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, PlatformChip, formatFollowers } from '../_components/ui';

interface Dim { label: string; value: number }
interface IgView { accountId: string; name?: string; followers?: number | null; age: Dim[]; gender: Dim[]; countries: Dim[]; hasData?: boolean; error?: string }
interface FbView { accountId: string; name?: string; followers?: number | null; stats: { totalFollows?: number; newFollows28d?: number; engagements28d?: number; pageViews28d?: number }; hasData?: boolean; error?: string }

const GENDER_COLORS = ['#025FCC', '#DB2777', '#9CA3AF'];

export default function AudienceInsights() {
  const [data, setData] = useState<{ available: boolean; instagram: IgView[]; facebook: FbView[] }>({ available: false, instagram: [], facebook: [] });
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<'instagram' | 'facebook'>('instagram');
  const [idx, setIdx] = useState(0);

  const load = () => {
    setLoading(true);
    fetch('/api/audience', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // default to whichever platform has accounts
        if ((d.instagram ?? []).length === 0 && (d.facebook ?? []).length > 0) setPlatform('facebook');
      })
      .catch(() => setData({ available: false, instagram: [], facebook: [] }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const igList = data.instagram ?? [];
  const fbList = data.facebook ?? [];
  const list = platform === 'instagram' ? igList : fbList;
  const view = list[idx] ?? list[0];
  const ig = platform === 'instagram' ? (view as IgView) : null;
  const fb = platform === 'facebook' ? (view as FbView) : null;

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

      {loading ? (
        <DemoCard className="py-12 text-center text-sm text-neutral-500">Loading audience data…</DemoCard>
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
            !ig.hasData ? (
              <DemoCard className="py-12 text-center text-sm text-neutral-600">
                No demographic data yet. Instagram only provides age/gender/country once the account has <span className="font-medium">100+ followers</span>.
              </DemoCard>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <StatCard label="Followers" value={ig.followers != null ? formatFollowers(ig.followers) : '—'} />
                  <StatCard label="Top age group" value={[...ig.age].sort((a, b) => b.value - a.value)[0]?.label ?? '—'} />
                  <StatCard label="Top country" value={ig.countries[0]?.label ?? '—'} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <DemoCard className="lg:col-span-2">
                    <SectionTitle title="Age distribution" subtitle="Followers by age range" />
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ig.age} margin={{ left: -16, top: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" />
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#757575' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#757575' }} tickFormatter={(v) => formatFollowers(v)} />
                          <Tooltip formatter={(v: number) => formatFollowers(v)} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#025FCC" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </DemoCard>
                  <DemoCard>
                    <SectionTitle title="Gender" />
                    <div className="mt-2 h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={ig.gender} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={3}>
                            {ig.gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatFollowers(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 text-xs text-neutral-700">
                      {ig.gender.map((g, i) => (
                        <span key={g.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GENDER_COLORS[i % GENDER_COLORS.length] }} /> {g.label} ({formatFollowers(g.value)})</span>
                      ))}
                    </div>
                  </DemoCard>
                </div>
                <DemoCard>
                  <SectionTitle title="Top countries" subtitle="Where your followers are" />
                  <div className="mt-4 flex flex-col gap-2.5">
                    {(() => {
                      const max = Math.max(...ig.countries.map((c) => c.value), 1);
                      return ig.countries.map((c) => (
                        <div key={c.label}>
                          <div className="mb-1 flex justify-between text-sm"><span className="text-neutral-700">{c.label}</span><span className="font-medium text-neutral-800">{formatFollowers(c.value)}</span></div>
                          <div className="h-2 w-full rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-primary-800" style={{ width: `${Math.round((c.value / max) * 100)}%` }} /></div>
                        </div>
                      ));
                    })()}
                  </div>
                </DemoCard>
              </>
            )
          ) : platform === 'facebook' && fb ? (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Followers" value={fb.followers != null ? formatFollowers(fb.followers) : '—'} />
                <StatCard label="New follows · 28d" value={formatFollowers(fb.stats.newFollows28d ?? 0)} />
                <StatCard label="Page views · 28d" value={formatFollowers(fb.stats.pageViews28d ?? 0)} />
                <StatCard label="Engagements · 28d" value={formatFollowers(fb.stats.engagements28d ?? 0)} />
              </div>
              <DemoCard className="flex items-start gap-3 py-5 text-sm text-neutral-600">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-neutral-400" />
                <p>Facebook no longer exposes Page audience demographics (age, gender, country) through its API — only the aggregate stats above are available. For demographic breakdowns, use the Instagram tab.</p>
              </DemoCard>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
