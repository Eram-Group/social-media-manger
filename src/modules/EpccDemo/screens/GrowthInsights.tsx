'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, RefreshCw, Clock, Sparkles, ExternalLink, AlertCircle } from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, formatFollowers, CHART_COLORS, ChartCard, StatCardSkeleton, ChartSkeleton } from '../_components/ui';
import { CategoryBarChart, TrendLineChart, ScatterPlot } from '../_components/charts';
import { useApi } from '../_services/useApi';

interface GrowthPoint { date: string; adds: number; removes: number; net: number }
interface Dim { label: string; value: number }
interface FbPost { id: string; message: string; permalink?: string; likes: number; comments: number; shares: number; eng: number; createdTime: string }
interface FbView {
  accountId: string; name?: string; followers?: number | null; category?: string | null; link?: string | null;
  talkingAbout?: number | null; postCount?: number;
  growth: GrowthPoint[];
  totals: { newFollows28d?: number; unfollows28d?: number; netFollows28d?: number; engagements28d?: number; pageViews28d?: number; videoViews28d?: number; videoWatchTimeSec?: number; totalActions28d?: number };
  reactions: Record<string, number>;
  topPosts: FbPost[];
  contentMix: Dim[];
  daily?: { date: string; engagements: number }[];
}
interface IgView { accountId: string; name?: string; followers?: number | null; stats?: Record<string, number>; mediaCount?: number }
interface BestTimes {
  byHour: { hour: number; eng: number; posts: number }[];
  byDay: { day: number; label: string; eng: number; posts: number }[];
  heat: number[][];
  recommended: { day: string; hour: number; label: string } | null;
  sampleSize: number;
}
interface Overview { available: boolean; facebook: FbView[]; instagram: IgView[]; bestTimes: BestTimes | null }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const REACTION_EMOJI: Record<string, string> = { like: '👍', love: '❤️', wow: '😮', haha: '😆', sorry: '😢', sad: '😢', anger: '😡', angry: '😡', care: '🥰', thankful: '🌸' };

function watchTime(sec?: number): string {
  if (!sec) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Heatmap cell colour — interpolate from light neutral to primary blue by intensity.
function heatColor(value: number, max: number): string {
  if (!value || max <= 0) return '#F3F4F6';
  const t = Math.min(1, value / max);
  // light (#DCEAFB) → strong (#025FCC)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(220, 2)}, ${lerp(234, 95)}, ${lerp(251, 204)})`;
}

export default function GrowthInsights() {
  const { data: raw, loading, refresh } = useApi<Overview>('/api/overview');
  const data = raw ?? { available: false, facebook: [], instagram: [], bestTimes: null };
  const fb = data.facebook?.[0];
  const ig = data.instagram?.[0];
  const bt = data.bestTimes;

  const netNew = (fb?.growth ?? []).map((g) => ({ label: g.date.slice(5), value: g.net }));
  const engTrend = (fb?.daily ?? []).map((d) => ({ date: d.date.slice(5), engagements: d.engagements }));
  const perf = (fb?.topPosts ?? []).map((p) => ({ x: p.eng, y: p.comments, name: (p.message ?? '').slice(0, 24) }));

  const heatMax = useMemo(() => {
    if (!bt) return 0;
    let m = 0;
    for (const row of bt.heat) for (const v of row) if (v > m) m = v;
    return m;
  }, [bt]);

  // Only show hour columns in a sensible window (06:00–23:00) to keep the grid compact,
  // but widen if posts fall outside it.
  const hourRange = useMemo(() => {
    if (!bt) return { start: 6, end: 23 };
    let min = 23, max = 6;
    bt.heat.forEach((row) => row.forEach((v, h) => { if (v > 0) { min = Math.min(min, h); max = Math.max(max, h); } }));
    if (min > max) return { start: 8, end: 20 };
    return { start: Math.min(min, 8), end: Math.max(max, 18) };
  }, [bt]);
  const hours = useMemo(() => Array.from({ length: hourRange.end - hourRange.start + 1 }, (_, i) => hourRange.start + i), [hourRange]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Growth & Best Time" subtitle="Real follower growth, content performance, and when your audience engages most." />
        <button onClick={() => refresh()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && !raw ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
          </div>
        </div>
      ) : !data.available ? (
        <DemoCard className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><TrendingUp size={22} /></span>
          <div>
            <p className="font-Sora text-base font-semibold">Connect an account</p>
            <p className="mt-1 max-w-md text-sm text-neutral-500">Growth and best-time data come from your connected Facebook & Instagram accounts.</p>
          </div>
          <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect an account →</a>
        </DemoCard>
      ) : (
        <>
          {/* ---- Facebook KPIs ---- */}
          {fb && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Followers" value={fb.followers != null ? formatFollowers(fb.followers) : '—'} />
              <StatCard label="Net follows · 28d" value={(fb.totals.netFollows28d ?? 0) >= 0 ? `+${fb.totals.netFollows28d ?? 0}` : String(fb.totals.netFollows28d)} />
              <StatCard label="Engagements · 28d" value={formatFollowers(fb.totals.engagements28d ?? 0)} />
              <StatCard label="Page views · 28d" value={formatFollowers(fb.totals.pageViews28d ?? 0)} />
              <StatCard label="Video views · 28d" value={formatFollowers(fb.totals.videoViews28d ?? 0)} />
              <StatCard label="Watch time · 28d" value={watchTime(fb.totals.videoWatchTimeSec)} />
            </div>
          )}

          {/* ---- Best time to post ---- */}
          {bt && (
            <DemoCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle title="Best time to post" subtitle={`Computed from your last ${bt.sampleSize} posts · engagement by day & hour (KSA time)`} />
                {bt.recommended && (
                  <span className="flex items-center gap-2 rounded-full bg-secondary-200 px-3 py-1.5 text-sm font-medium text-primary-900">
                    <Sparkles size={15} /> Best slot: {bt.recommended.label}
                  </span>
                )}
              </div>

              {bt.sampleSize === 0 ? (
                <p className="mt-6 text-center text-sm text-neutral-500">Publish a few posts and this heatmap fills with your real engagement patterns.</p>
              ) : (
                <>
                  {/* Heatmap */}
                  <div className="mt-5 overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <div className="flex">
                        <div className="w-10 shrink-0" />
                        {hours.map((h) => (
                          <div key={h} className="w-7 shrink-0 text-center text-[10px] text-neutral-400">{h}</div>
                        ))}
                      </div>
                      {bt.heat.map((row, d) => (
                        <div key={d} className="flex items-center">
                          <div className="w-10 shrink-0 text-xs font-medium text-neutral-500">{DAY_LABELS[d]}</div>
                          {hours.map((h) => (
                            <div key={h} className="p-0.5">
                              <div
                                title={`${DAY_LABELS[d]} ${String(h).padStart(2, '0')}:00 — ${row[h]} engagement`}
                                className="h-6 w-6 rounded"
                                style={{ background: heatColor(row[h], heatMax) }}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
                    <Clock size={13} /> Less
                    <span className="h-3 w-4 rounded" style={{ background: heatColor(0, 1) }} />
                    <span className="h-3 w-4 rounded" style={{ background: heatColor(0.34, 1) }} />
                    <span className="h-3 w-4 rounded" style={{ background: heatColor(0.67, 1) }} />
                    <span className="h-3 w-4 rounded" style={{ background: heatColor(1, 1) }} />
                    More engagement
                  </div>
                </>
              )}
            </DemoCard>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* ---- Follower growth ---- */}
            {fb && (
              <DemoCard className="xl:col-span-2">
                <SectionTitle title="Follower growth" subtitle="Daily new follows vs. unfollows (net)" />
                <div className="mt-4 h-64">
                  {fb.growth.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={fb.growth} margin={{ left: -18, top: 8 }}>
                        <defs>
                          <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#025FCC" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#025FCC" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#757575' }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fontSize: 11, fill: '#757575' }} allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="net" stroke="#025FCC" strokeWidth={2} fill="url(#netGrad)" name="Net follows" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-neutral-400">No follower data yet</div>}
                </div>
              </DemoCard>
            )}

            {/* ---- Content mix ---- */}
            {fb && fb.contentMix.length > 0 && (
              <DemoCard>
                <SectionTitle title="Content mix" subtitle={`${fb.postCount ?? 0} recent posts by type`} />
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fb.contentMix} dataKey="value" nameKey="label" innerRadius={45} outerRadius={78} paddingAngle={3}>
                        {fb.contentMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 text-xs text-neutral-700">
                  {fb.contentMix.map((c, i) => (
                    <span key={c.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /> {c.label} ({c.value})</span>
                  ))}
                </div>
              </DemoCard>
            )}
          </div>

          {/* ---- New chart cards ---- */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <ChartCard title="Net new followers" subtitle="Per day" isEmpty={!netNew.length}>
              <CategoryBarChart data={netNew} />
            </ChartCard>
            <ChartCard title="Engagement trend" subtitle="Daily post engagements" isEmpty={!engTrend.length}>
              <TrendLineChart data={engTrend} series={[{ key: 'engagements', name: 'Engagements' }]} />
            </ChartCard>
            <ChartCard title="Post performance" subtitle="Engagement vs comments" isEmpty={!perf.length}>
              <ScatterPlot data={perf} xName="Engagement" yName="Comments" />
            </ChartCard>
          </div>

          {/* ---- Reactions ---- */}
          {fb && Object.values(fb.reactions).some((n) => n > 0) && (
            <DemoCard>
              <SectionTitle title="Reactions · last 28 days" subtitle="Across all Page posts" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(fb.reactions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <span key={k} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700">
                    <span>{REACTION_EMOJI[k] ?? '•'}</span> <span className="capitalize">{k}</span> <span className="font-semibold">{formatFollowers(n)}</span>
                  </span>
                ))}
              </div>
            </DemoCard>
          )}

          {/* ---- Instagram performance ---- */}
          {ig && ig.stats && Object.keys(ig.stats).length > 0 && (
            <DemoCard>
              <SectionTitle title={`Instagram · ${ig.name ?? ''}`} subtitle="Last 28 days" />
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Followers" value={ig.followers != null ? formatFollowers(ig.followers) : '—'} />
                <StatCard label="Reach" value={formatFollowers(ig.stats.reach ?? 0)} />
                <StatCard label="Views" value={formatFollowers(ig.stats.views ?? 0)} />
                <StatCard label="Interactions" value={formatFollowers(ig.stats.total_interactions ?? 0)} />
                <StatCard label="Profile views" value={formatFollowers(ig.stats.profile_views ?? 0)} />
                <StatCard label="Accounts engaged" value={formatFollowers(ig.stats.accounts_engaged ?? 0)} />
                <StatCard label="Saves" value={formatFollowers(ig.stats.saves ?? 0)} />
                <StatCard label="Link taps" value={formatFollowers(ig.stats.profile_links_taps ?? 0)} />
              </div>
            </DemoCard>
          )}

          {/* ---- Top posts ---- */}
          {fb && fb.topPosts.length > 0 && (
            <DemoCard>
              <SectionTitle title="Top posts" subtitle="Your best Facebook posts by real engagement" />
              <div className="mt-3 flex flex-col divide-y divide-neutral-200">
                {fb.topPosts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.message || '(no caption)'}</p>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
                      <span>👍 {p.likes}</span>
                      <span>💬 {p.comments}</span>
                      <span>↗ {p.shares}</span>
                      <span className="font-semibold text-neutral-700">{p.eng} eng</span>
                      {p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-primary-800 hover:text-primary-900"><ExternalLink size={14} /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </DemoCard>
          )}

          <DemoCard className="flex items-start gap-3 py-5 text-sm text-neutral-600">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-neutral-400" />
            <p>All figures are live from the Meta Graph API. Page-level reach/impressions and Facebook audience demographics were removed by Meta — the metrics shown here are everything still available. Best-time is computed from your real posts’ engagement.</p>
          </DemoCard>
        </>
      )}
    </div>
  );
}
