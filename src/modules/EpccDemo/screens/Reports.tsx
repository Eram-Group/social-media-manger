'use client';

import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Printer, RefreshCw, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, PlatformChip, formatFollowers } from '../_components/ui';
import { useApi } from '../_services/useApi';
import { getPlatform, platformChartColor, TPlatformId } from '@/mock-server/platforms';

interface Report {
  ok: boolean;
  period: 'weekly' | 'monthly';
  rangeDays: number;
  summary: { totalFollowers: number; totalReach: number; totalEngagement: number; totalPosts: number; totalComments: number };
  platforms: { platform: TPlatformId; name?: string; followers: number; stats: Record<string, number>; error?: string }[];
  demographics: { age: { label: string; value: number }[]; gender: { label: string; value: number }[]; countries: { label: string; value: number }[] } | null;
  topPosts: { platform: TPlatformId; content: string; permalink?: string; likes: number; comments: number; shares?: number; engagement: number }[];
  sentiment: { positive: number; neutral: number; negative: number; themes: { theme: string; sentiment: string; mentions: number }[]; source: string };
  executiveSummary: string;
}

const GENDER_COLORS = ['#025FCC', '#DB2777', '#9CA3AF'];
const SENT_COLOR: Record<string, string> = { positive: 'text-warnings-success', neutral: 'text-neutral-500', negative: 'text-text-red' };

export default function Reports() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const { data: raw, loading, refresh } = useApi<Report>(`/api/report?period=${period}`);
  const data = raw && raw.ok ? raw : null;
  const load = () => refresh();

  const s = data?.summary;
  const sent = data?.sentiment;
  const sentTotal = sent ? sent.positive + sent.neutral + sent.negative : 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      {/* Header / controls — hidden when printing */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <SectionTitle title="Reports" subtitle="A complete performance report from your connected accounts — share with Chamber leadership." />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${period === p ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100'}`}>{p}</button>
            ))}
          </div>
          <button onClick={() => load()} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50" title="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900"><Printer size={15} /> Export PDF</button>
        </div>
      </div>

      {loading ? (
        <DemoCard className="py-16 text-center text-sm text-neutral-500">Building your report from live data…</DemoCard>
      ) : !data ? (
        <DemoCard className="py-16 text-center text-sm text-neutral-500">No report data — connect an account first.</DemoCard>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Report title block (shows in print) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="font-Sora text-xl font-semibold text-text-dark">Eastern Province Chamber of Commerce</p>
            <p className="text-sm text-neutral-600">Social Media Performance Report · <span className="capitalize">{period}</span> ({data.rangeDays} days) · {today}</p>
          </div>

          {/* Executive summary (AI) */}
          <DemoCard className="border-primary-200 bg-primary-100/40">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary-900"><Sparkles size={16} /> Executive summary</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-800">{data.executiveSummary}</p>
          </DemoCard>

          {/* KPI summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Total followers" value={formatFollowers(s!.totalFollowers)} />
            <StatCard label="Reach" value={formatFollowers(s!.totalReach)} />
            <StatCard label="Engagement" value={formatFollowers(s!.totalEngagement)} />
            <StatCard label="Posts" value={String(s!.totalPosts)} />
            <StatCard label="Comments" value={String(s!.totalComments)} />
          </div>

          {/* Per-platform */}
          <DemoCard>
            <SectionTitle title="By platform" subtitle="Followers and performance per connected account" />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.platforms.map((p) => (
                <div key={p.platform} className="rounded-xl border border-neutral-200 p-4">
                  <div className="mb-3 flex items-center gap-2"><PlatformChip platform={p.platform} size="md" withLabel /><span className="ml-auto text-sm text-neutral-500">{formatFollowers(p.followers)} followers</span></div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {Object.entries(p.stats).slice(0, 6).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-neutral-100 p-2">
                        <p className="font-Sora text-sm font-semibold text-text-dark">{formatFollowers(v as number)}</p>
                        <p className="truncate text-[10px] capitalize text-neutral-500">{k.replace(/_/g, ' ')}</p>
                      </div>
                    ))}
                    {Object.keys(p.stats).length === 0 && <p className="col-span-3 text-xs text-neutral-400">No insight data in this period.</p>}
                  </div>
                </div>
              ))}
            </div>
          </DemoCard>

          {/* Sentiment (AI over real comments) */}
          <DemoCard>
            <SectionTitle title="Audience sentiment" subtitle={`AI analysis of ${sentTotal} real comment${sentTotal === 1 ? '' : 's'}${sent?.source === 'fallback' ? ' · connect AI for full analysis' : ''}`} />
            {sentTotal === 0 ? (
              <p className="mt-3 text-sm text-neutral-400">No comments in this period.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart>
                    <Pie data={[{ n: 'Positive', v: sent!.positive }, { n: 'Neutral', v: sent!.neutral }, { n: 'Negative', v: sent!.negative }]} dataKey="v" nameKey="n" innerRadius={40} outerRadius={65}>
                      {['#00A87E', '#9CA3AF', '#D50415'].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                  <div className="flex justify-center gap-3 text-xs">
                    <span className="text-warnings-success">● {sent!.positive} pos</span>
                    <span className="text-neutral-500">● {sent!.neutral} neu</span>
                    <span className="text-text-red">● {sent!.negative} neg</span>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Recurring themes</p>
                  <div className="flex flex-col divide-y divide-neutral-100">
                    {(sent!.themes ?? []).map((t, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-neutral-800">{t.theme}</span>
                        <span className="flex items-center gap-3"><span className={`capitalize ${SENT_COLOR[t.sentiment] ?? ''}`}>{t.sentiment}</span><span className="text-neutral-500">{t.mentions}</span></span>
                      </div>
                    ))}
                    {(!sent!.themes || sent!.themes.length === 0) && <p className="py-3 text-sm text-neutral-400">No themes extracted.</p>}
                  </div>
                </div>
              </div>
            )}
          </DemoCard>

          {/* Demographics (IG) */}
          {data.demographics ? (
            <DemoCard>
              <SectionTitle title="Audience demographics" subtitle="From Instagram followers" />
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Age</p>
                  <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.demographics.age}><CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#757575' }} /><YAxis tick={{ fontSize: 11, fill: '#757575' }} /><Tooltip /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#025FCC" /></BarChart></ResponsiveContainer></div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Gender</p>
                  <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.demographics.gender} dataKey="value" nameKey="label" innerRadius={42} outerRadius={66}>{data.demographics.gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % 3]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                </div>
              </div>
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Top countries</p>
                <div className="flex flex-wrap gap-2">{data.demographics.countries.map((c) => <span key={c.label} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">{c.label} · {formatFollowers(c.value)}</span>)}</div>
              </div>
            </DemoCard>
          ) : (
            <DemoCard className="flex items-start gap-3 py-5 text-sm text-neutral-600">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-neutral-400" />
              <p>Audience demographics appear once an Instagram account has 100+ followers (Facebook Pages no longer expose demographics via the API).</p>
            </DemoCard>
          )}

          {/* Top posts */}
          <DemoCard>
            <SectionTitle title="Top posts" subtitle="By real engagement this period" />
            <div className="mt-4 flex flex-col divide-y divide-neutral-200">
              {data.topPosts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400">#{i + 1}</span>
                    <PlatformChip platform={p.platform} />
                    {p.permalink ? <a href={p.permalink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-neutral-800 hover:text-primary-800 hover:underline">{p.content}</a> : <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-600">
                    <span className="flex items-center gap-1 font-medium text-text-dark"><TrendingUp size={12} /> {formatFollowers(p.engagement)}</span>
                    <span>❤️ {formatFollowers(p.likes)}</span>
                    <span>💬 {formatFollowers(p.comments)}</span>
                  </div>
                </div>
              ))}
              {data.topPosts.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">No posts in this period.</p>}
            </div>
          </DemoCard>

          <p className="text-center text-xs text-neutral-400">Generated from live Meta data{sent?.source === 'openai' ? ' · sentiment & summary by AI' : ''} · {today}</p>
        </div>
      )}
    </div>
  );
}
