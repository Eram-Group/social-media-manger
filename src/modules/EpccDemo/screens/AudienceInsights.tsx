'use client';

import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Users, RefreshCw, AlertCircle } from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, PlatformChip, formatFollowers } from '../_components/ui';

interface Dim { label: string; value: number }
interface AudienceView {
  accountId: string;
  name?: string;
  followers?: number | null;
  age: Dim[];
  gender: Dim[];
  countries: Dim[];
  hasData?: boolean;
  error?: string;
}

const GENDER_COLORS = ['#025FCC', '#DB2777', '#9CA3AF'];

export default function AudienceInsights() {
  const [data, setData] = useState<{ available: boolean; reason?: string; accounts: AudienceView[] }>({ available: false, accounts: [] });
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  const load = () => {
    setLoading(true);
    fetch('/api/audience', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ available: false, accounts: [] }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const view = data.accounts[idx];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Audience Insights" subtitle="Real follower demographics from your connected Instagram account(s)." />
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
            <p className="font-Sora text-base font-semibold">Connect an Instagram account</p>
            <p className="mt-1 max-w-md text-sm text-neutral-500">Audience demographics (age, gender, country) come from Instagram. Facebook Pages no longer expose these via the API.</p>
          </div>
          <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect Instagram →</a>
        </DemoCard>
      ) : (
        <>
          {data.accounts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {data.accounts.map((a, i) => (
                <button key={a.accountId} onClick={() => setIdx(i)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${i === idx ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}>
                  <PlatformChip platform="instagram" /> {a.name ?? a.accountId}
                </button>
              ))}
            </div>
          )}

          {view?.error ? (
            <DemoCard className="flex items-center gap-2 py-8 text-sm text-text-red">
              <AlertCircle size={16} /> Couldn’t load demographics: {view.error}. Reconnect Instagram to grant the insights permission.
            </DemoCard>
          ) : !view?.hasData ? (
            <DemoCard className="py-12 text-center text-sm text-neutral-600">
              No demographic data yet. Instagram only provides this once the account has <span className="font-medium">100+ followers</span>.
            </DemoCard>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatCard label="Followers" value={view.followers != null ? formatFollowers(view.followers) : '—'} />
                <StatCard label="Top age group" value={[...view.age].sort((a, b) => b.value - a.value)[0]?.label ?? '—'} />
                <StatCard label="Top country" value={view.countries[0]?.label ?? '—'} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <DemoCard className="lg:col-span-2">
                  <SectionTitle title="Age distribution" subtitle="Followers by age range" />
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={view.age} margin={{ left: -16, top: 8 }}>
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
                        <Pie data={view.gender} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {view.gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatFollowers(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 text-xs text-neutral-700">
                    {view.gender.map((g, i) => (
                      <span key={g.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GENDER_COLORS[i % GENDER_COLORS.length] }} /> {g.label} ({formatFollowers(g.value)})</span>
                    ))}
                  </div>
                </DemoCard>
              </div>

              <DemoCard>
                <SectionTitle title="Top countries" subtitle="Where your followers are" />
                <div className="mt-4 flex flex-col gap-2.5">
                  {(() => {
                    const max = Math.max(...view.countries.map((c) => c.value), 1);
                    return view.countries.map((c) => (
                      <div key={c.label}>
                        <div className="mb-1 flex justify-between text-sm"><span className="text-neutral-700">{c.label}</span><span className="font-medium text-neutral-800">{formatFollowers(c.value)}</span></div>
                        <div className="h-2 w-full rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-primary-800" style={{ width: `${Math.round((c.value / max) * 100)}%` }} /></div>
                      </div>
                    ));
                  })()}
                </div>
              </DemoCard>
            </>
          )}
        </>
      )}
    </div>
  );
}
