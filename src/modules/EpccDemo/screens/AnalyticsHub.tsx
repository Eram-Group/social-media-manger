'use client';

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { Printer, RefreshCw, Sparkles, TrendingUp, Clock, ExternalLink, AlertCircle } from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, PlatformChip, formatFollowers, CHART_COLORS, ChartCard, ChartSkeleton, StatCardSkeleton, GENDER_COLORS } from '../_components/ui';
import { DonutChart, TrendLineChart, CategoryBarChart } from '../_components/charts';
import { useApi } from '../_services/useApi';
import { TPlatformId } from '@/mock-server/platforms';
import type { AnalyticsPdfData } from '../_components/AnalyticsPdf';

// ---------- types ----------
interface Report {
  ok: boolean; period: string; rangeDays: number;
  summary: { totalFollowers: number; totalReach: number; totalEngagement: number; totalPosts: number; totalComments: number };
  platforms: { platform: TPlatformId; name?: string; followers: number; stats: Record<string, number>; error?: string }[];
  demographics: { age: Dim[]; gender: Dim[]; countries: Dim[] } | null;
  topPosts: { platform: TPlatformId; content: string; permalink?: string; likes: number; comments: number; engagement: number }[];
  sentiment: { positive: number; neutral: number; negative: number; themes: { theme: string; sentiment: string; mentions: number }[]; source: string };
  executiveSummary: string;
}
interface Dim { label: string; value: number }
interface GrowthPoint { date: string; net: number; adds: number; removes: number }
interface FbOv { growth: GrowthPoint[]; totals: Record<string, number>; reactions: Record<string, number>; contentMix: Dim[]; postCount?: number; daily?: { date: string; pageViews: number; videoViews: number }[] }
interface IgOv { stats?: Record<string, number>; mediaCount?: number }
interface BestTimes { heat: number[][]; recommended: { label: string } | null; sampleSize: number }
interface Overview { available: boolean; facebook: FbOv[]; instagram: IgOv[]; bestTimes: BestTimes | null }

type PlatformFilter = 'all' | 'facebook' | 'instagram';
type Period = 'weekly' | 'monthly';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const REACTION_EMOJI: Record<string, string> = { like: '👍', love: '❤️', wow: '😮', haha: '😆', sorry: '😢', sad: '😢', anger: '😡', angry: '😡', care: '🥰' };
const SENT_COLOR: Record<string, string> = { positive: 'text-warnings-success', neutral: 'text-neutral-500', negative: 'text-text-red' };

function watchTime(sec?: number): string {
  if (!sec) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
function heatColor(value: number, max: number): string {
  if (!value || max <= 0) return '#F3F4F6';
  const t = Math.min(1, value / max);
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(220, 2)}, ${lerp(234, 95)}, ${lerp(251, 204)})`;
}

export default function AnalyticsHub() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [platform, setPlatform] = useState<PlatformFilter>('all');

  const { data: rRaw, loading: rLoading, refresh: rRefresh } = useApi<Report>(`/api/report?period=${period}`);
  const { data: oRaw, loading: oLoading, refresh: oRefresh } = useApi<Overview>(`/api/overview?period=${period}`);
  const report = rRaw && rRaw.ok ? rRaw : null;
  const ov = oRaw ?? null;
  const loading = rLoading || oLoading;
  const refresh = () => { rRefresh(); oRefresh(); };

  const [exporting, setExporting] = useState(false);

  const showFB = platform === 'all' || platform === 'facebook';
  const showIG = platform === 'all' || platform === 'instagram';
  const fbOv = ov?.facebook?.[0];
  const igOv = ov?.instagram?.[0];
  const bt = ov?.bestTimes;
  const today = new Date().toISOString().slice(0, 10);

  const heatMax = useMemo(() => {
    if (!bt) return 0; let m = 0; for (const row of bt.heat) for (const v of row) if (v > m) m = v; return m;
  }, [bt]);
  const hours = useMemo(() => Array.from({ length: 15 }, (_, i) => i + 7), []); // 07:00–21:00

  // KPI cards adapt to the platform filter.
  const platformBlocks = (report?.platforms ?? []).filter((p) => platform === 'all' || p.platform === platform);
  const filteredTopPosts = (report?.topPosts ?? []).filter((p) => platform === 'all' || p.platform === platform).slice(0, 8);
  const kpis = useMemo(() => {
    if (!report) return [];
    if (platform === 'all') {
      const s = report.summary;
      return [
        { label: 'Total followers', value: formatFollowers(s.totalFollowers) },
        { label: 'Reach', value: formatFollowers(s.totalReach) },
        { label: 'Engagement', value: formatFollowers(s.totalEngagement) },
        { label: 'Posts', value: String(s.totalPosts) },
        { label: 'Comments', value: String(s.totalComments) },
      ];
    }
    const b = platformBlocks[0];
    if (!b) return [];
    const stat = (k: string) => b.stats[k] ?? 0;
    return [
      { label: 'Followers', value: formatFollowers(b.followers) },
      { label: 'Reach', value: formatFollowers(stat('reach')) },
      { label: 'Interactions', value: formatFollowers(stat('total_interactions') || stat('reach')) },
      { label: 'Likes', value: formatFollowers(stat('likes')) },
      { label: 'Comments', value: formatFollowers(stat('comments')) },
    ];
  }, [report, platform, platformBlocks]);

  const reactionsData = Object.entries(fbOv?.reactions ?? {}).map(([label, value]) => ({ label, value: Number(value) }));
  const engByPlatform = (report?.platforms ?? []).map((p) => ({
    label: p.name ?? p.platform,
    value: Number((p.stats as any)?.engagements ?? (p.stats as any)?.total_interactions ?? (p.stats as any)?.accounts_engaged ?? 0),
  }));
  const reachTrend = (fbOv?.daily ?? []).map((d: any) => ({ date: d.date?.slice(5), pageViews: d.pageViews, videoViews: d.videoViews }));
  const topPostsBar = (filteredTopPosts ?? []).slice(0, 6).map((p: any, i: number) => ({ label: `#${i + 1}`, value: Number(p.engagement ?? 0) }));

  const sent = report?.sentiment;
  const sentTotal = sent ? sent.positive + sent.neutral + sent.negative : 0;

  // Export a real, branded vector PDF (built with @react-pdf/renderer — consistent
  // output, unlike the browser print engine). Lazy-loaded so it stays out of the
  // main bundle and never runs on the server.
  const exportPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const net = fbOv?.totals.netFollows28d ?? 0;
      const data: AnalyticsPdfData = {
        meta: {
          period: period === 'weekly' ? 'Weekly' : 'Monthly',
          scope: platform === 'all' ? 'All platforms' : cap(platform),
          rangeDays: report.rangeDays,
          date: today,
        },
        executiveSummary: report.executiveSummary,
        kpis,
        fbTotals: showFB && fbOv ? [
          { label: `Net follows · ${report.rangeDays}d`, value: net >= 0 ? `+${net}` : String(net) },
          { label: 'Page views', value: formatFollowers(fbOv.totals.pageViews28d ?? 0) },
          { label: 'Video views', value: formatFollowers(fbOv.totals.videoViews28d ?? 0) },
          { label: 'Watch time', value: watchTime(fbOv.totals.videoWatchTimeSec) },
        ] : undefined,
        growth: showFB && fbOv ? fbOv.growth.map((g) => ({ date: g.date, net: g.net })) : undefined,
        contentMix: showFB && fbOv ? fbOv.contentMix : undefined,
        reactions: showFB && fbOv
          ? Object.entries(fbOv.reactions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ label: cap(k), value: n }))
          : undefined,
        bestTime: bt && bt.sampleSize > 0 ? { heat: bt.heat, recommended: bt.recommended?.label ?? null } : null,
        platforms: platformBlocks.map((p) => ({
          platform: p.platform, followers: p.followers,
          stats: Object.entries(p.stats).slice(0, 6).map(([k, v]) => ({ k, v: v as number })),
        })),
        demographics: showIG && report.demographics ? report.demographics : null,
        sentiment: sent && sentTotal > 0 ? { positive: sent.positive, neutral: sent.neutral, negative: sent.negative, themes: sent.themes ?? [] } : null,
        topPosts: filteredTopPosts.map((p) => ({ platform: p.platform, content: p.content, likes: p.likes, comments: p.comments, engagement: p.engagement })),
        engByPlatform: engByPlatform.some((d) => d.value > 0) ? engByPlatform : undefined,
        topPostsChart: topPostsBar.length ? topPostsBar : undefined,
      };
      const { buildAnalyticsPdfBlob } = await import('../_components/AnalyticsPdf');
      const blob = await buildAnalyticsPdfBlob(data);
      const scope = platform === 'all' ? 'All' : cap(platform);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EPCC-Analytics_${period === 'weekly' ? 'Weekly' : 'Monthly'}_${scope}_${today}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls — hidden in PDF */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <SectionTitle title="Analytics & Reports" subtitle="Audience, growth and performance in one place — filter, then export a branded PDF." />
        <div className="flex flex-wrap items-center gap-2">
          {/* platform filter */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {([['all', 'All'], ['facebook', 'Facebook'], ['instagram', 'Instagram']] as [PlatformFilter, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setPlatform(key)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${platform === key ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100'}`}>{label}</button>
            ))}
          </div>
          {/* period */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
            {(['weekly', 'monthly'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${period === p ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100'}`}>{p === 'weekly' ? 'Week' : 'Month'}</button>
            ))}
          </div>
          <button onClick={refresh} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50" title="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={exportPdf} disabled={exporting || !report} title="Download a branded, designed PDF report of the current filter" className="flex items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900 disabled:opacity-50">
            {exporting ? <RefreshCw size={15} className="animate-spin" /> : <Printer size={15} />} {exporting ? 'Generating…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {loading && !report ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
            </div>
          </div>
        ) : !report ? (
        <DemoCard className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><TrendingUp size={22} /></span>
          <p className="font-Sora text-base font-semibold">Connect an account to see analytics</p>
          <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect an account →</a>
        </DemoCard>
      ) : (
        <div className="pdf-body flex flex-col gap-6">
          {/* Branded running header & footer — print only, repeat on every page */}
          <div className="print-runner print-header">
            <span>Eastern Province Chamber of Commerce</span>
            <span>Social Analytics Report</span>
          </div>
          <div className="print-runner print-footer">
            <span>Generated {today}{platform !== 'all' ? ` · ${platform}` : ''} · {period === 'weekly' ? 'Weekly' : 'Monthly'}</span>
            <span>Confidential — EPCC Social</span>
          </div>

          {/* Branded cover masthead */}
          <div className="pdf-cover pdf-keep overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="pdf-cover-bar h-1.5 w-full bg-gradient-to-r from-primary-800 via-primary-600 to-accent-800" />
            <div className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-800 font-Sora text-lg font-bold text-white">EP</div>
              <div className="min-w-0 flex-1">
                <p className="font-Sora text-xl font-semibold text-text-dark">Eastern Province Chamber of Commerce</p>
                <p className="text-sm text-neutral-600">
                  Social Analytics Report · <span className="font-medium capitalize">{period === 'weekly' ? 'Weekly' : 'Monthly'}</span> ({report.rangeDays} days)
                  {platform !== 'all' && <> · <span className="capitalize">{platform}</span></>} · {today}
                </p>
              </div>
              {/* Period badge — reads as a report cover tag in the PDF */}
              <span className="hidden shrink-0 rounded-full bg-secondary-200 px-3 py-1.5 font-Sora text-xs font-semibold text-primary-900 sm:inline-block">
                {period === 'weekly' ? '7-day' : '28-day'} report
              </span>
            </div>
            {/* PDF-only confidentiality line */}
            <p className="pdf-only border-t border-neutral-200 px-6 py-2.5 text-[10px] text-neutral-400">
              Confidential management report · generated from live Meta Graph API data · {today}
            </p>
          </div>

          {/* Executive summary */}
          <DemoCard className="border-primary-200 bg-primary-100/40">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary-900"><Sparkles size={16} /> Executive summary</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-800">{report.executiveSummary}</p>
          </DemoCard>

          {/* KPIs */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {kpis.map((k) => <StatCard key={k.label} label={k.label} value={k.value} />)}
            </div>
          )}

          {/* Facebook growth KPIs */}
          {showFB && fbOv && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 print:grid-cols-4">
              <StatCard label={`Net follows · ${report.rangeDays}d`} value={(fbOv.totals.netFollows28d ?? 0) >= 0 ? `+${fbOv.totals.netFollows28d ?? 0}` : String(fbOv.totals.netFollows28d)} />
              <StatCard label="Page views" value={formatFollowers(fbOv.totals.pageViews28d ?? 0)} />
              <StatCard label="Video views" value={formatFollowers(fbOv.totals.videoViews28d ?? 0)} />
              <StatCard label="Watch time" value={watchTime(fbOv.totals.videoWatchTimeSec)} />
            </div>
          )}

          {/* Best time to post */}
          {bt && bt.sampleSize > 0 && (
            <DemoCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle title="Best time to post" subtitle={`From your last ${bt.sampleSize} posts · engagement by day & hour (KSA)`} />
                {bt.recommended && <span className="flex items-center gap-2 rounded-full bg-secondary-200 px-3 py-1.5 text-sm font-medium text-primary-900"><Clock size={14} /> {bt.recommended.label}</span>}
              </div>
              <div className="mt-5 overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex">
                    <div className="w-10 shrink-0" />
                    {hours.map((h) => <div key={h} className="w-7 shrink-0 text-center text-[10px] text-neutral-400">{h}</div>)}
                  </div>
                  {bt.heat.map((row, d) => (
                    <div key={d} className="flex items-center">
                      <div className="w-10 shrink-0 text-xs font-medium text-neutral-500">{DAY_LABELS[d]}</div>
                      {hours.map((h) => (
                        <div key={h} className="p-0.5">
                          <div title={`${DAY_LABELS[d]} ${String(h).padStart(2, '0')}:00 — ${row[h]} eng`} className="h-6 w-6 rounded" style={{ background: heatColor(row[h], heatMax) }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </DemoCard>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Growth */}
            {showFB && fbOv && fbOv.growth.length > 0 && (
              <DemoCard className="xl:col-span-2">
                <SectionTitle title="Follower growth" subtitle="Daily net follows" />
                <div className="mt-4 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fbOv.growth} margin={{ left: -18, top: 8 }}>
                      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#025FCC" stopOpacity={0.35} /><stop offset="100%" stopColor="#025FCC" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#757575' }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11, fill: '#757575' }} allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="net" stroke="#025FCC" strokeWidth={2} fill="url(#ag)" name="Net follows" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </DemoCard>
            )}

            {/* Content mix */}
            {showFB && fbOv && fbOv.contentMix.length > 0 && (
              <DemoCard>
                <SectionTitle title="Content mix" subtitle={`${fbOv.postCount ?? 0} posts by type`} />
                <div className="mt-2 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fbOv.contentMix} dataKey="value" nameKey="label" innerRadius={42} outerRadius={74} paddingAngle={3}>
                        {fbOv.contentMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie><Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-neutral-700">
                  {fbOv.contentMix.map((c, i) => <span key={c.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /> {c.label} ({c.value})</span>)}
                </div>
              </DemoCard>
            )}
          </div>

          {/* Chart cards — reactions / engagement / views / top posts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Reactions" isEmpty={!reactionsData.length}>
              <DonutChart data={reactionsData} />
            </ChartCard>
            <ChartCard title="Engagement by platform" isEmpty={!engByPlatform.some((d) => d.value > 0)}>
              <CategoryBarChart data={engByPlatform} horizontal />
            </ChartCard>
            <ChartCard title="Views over time" subtitle="Page views & video views"
              isEmpty={!reachTrend.length}>
              <TrendLineChart data={reachTrend} series={[
                { key: 'pageViews', name: 'Page views' },
                { key: 'videoViews', name: 'Video views' },
              ]} />
            </ChartCard>
            <ChartCard title="Top posts by engagement" isEmpty={!topPostsBar.length}>
              <CategoryBarChart data={topPostsBar} />
            </ChartCard>
          </div>

          {/* Reactions (FB) */}
          {showFB && fbOv && Object.values(fbOv.reactions).some((n) => n > 0) && (
            <DemoCard>
              <SectionTitle title={`Reactions · ${report.rangeDays} days`} subtitle="Across all Page posts" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(fbOv.reactions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <span key={k} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700"><span>{REACTION_EMOJI[k] ?? '•'}</span> <span className="capitalize">{k}</span> <span className="font-semibold">{formatFollowers(n)}</span></span>
                ))}
              </div>
            </DemoCard>
          )}

          {/* Per-platform */}
          {platformBlocks.length > 0 && (
            <DemoCard>
              <SectionTitle title="By platform" subtitle="Followers and performance per account" />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {platformBlocks.map((p) => (
                  <div key={p.platform} className="rounded-xl border border-neutral-200 p-4">
                    <div className="mb-3 flex items-center gap-2"><PlatformChip platform={p.platform} size="md" withLabel /><span className="ml-auto text-sm text-neutral-500">{formatFollowers(p.followers)} followers</span></div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {Object.entries(p.stats).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-neutral-100 p-2"><p className="font-Sora text-sm font-semibold text-text-dark">{formatFollowers(v as number)}</p><p className="truncate text-[10px] capitalize text-neutral-500">{k.replace(/_/g, ' ')}</p></div>
                      ))}
                      {Object.keys(p.stats).length === 0 && <p className="col-span-3 text-xs text-neutral-400">No insight data in this period.</p>}
                    </div>
                  </div>
                ))}
              </div>
            </DemoCard>
          )}

          {/* Demographics (IG) */}
          {showIG && report.demographics && (
            <DemoCard>
              <SectionTitle title="Audience demographics" subtitle="From Instagram followers" />
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Age</p>
                  <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.demographics.age}><CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" /><XAxis dataKey="label" tick={{ fontSize: 11, fill: '#757575' }} /><YAxis tick={{ fontSize: 11, fill: '#757575' }} /><Tooltip /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#025FCC" /></BarChart></ResponsiveContainer></div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Gender</p>
                  <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.demographics.gender} dataKey="value" nameKey="label" innerRadius={40} outerRadius={64}>{report.demographics.gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i % 3]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                </div>
              </div>
              <div className="mt-3"><p className="mb-2 text-xs font-medium uppercase text-neutral-500">Top countries</p><div className="flex flex-wrap gap-2">{report.demographics.countries.map((c) => <span key={c.label} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-700">{c.label} · {formatFollowers(c.value)}</span>)}</div></div>
            </DemoCard>
          )}

          {/* Sentiment */}
          {sentTotal > 0 && (
            <DemoCard>
              <SectionTitle title="Audience sentiment" subtitle={`AI analysis of ${sentTotal} real comment${sentTotal === 1 ? '' : 's'}`} />
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <div className="h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ n: 'Positive', v: sent!.positive }, { n: 'Neutral', v: sent!.neutral }, { n: 'Negative', v: sent!.negative }]} dataKey="v" nameKey="n" innerRadius={40} outerRadius={65}>{['#00A87E', '#9CA3AF', '#D50415'].map((c, i) => <Cell key={i} fill={c} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                  <div className="flex justify-center gap-3 text-xs"><span className="text-warnings-success">● {sent!.positive} pos</span><span className="text-neutral-500">● {sent!.neutral} neu</span><span className="text-text-red">● {sent!.negative} neg</span></div>
                </div>
                <div className="lg:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase text-neutral-500">Recurring themes</p>
                  <div className="flex flex-col divide-y divide-neutral-100">
                    {(sent!.themes ?? []).map((t, i) => <div key={i} className="flex items-center justify-between py-2 text-sm"><span className="text-neutral-800">{t.theme}</span><span className="flex items-center gap-3"><span className={`capitalize ${SENT_COLOR[t.sentiment] ?? ''}`}>{t.sentiment}</span><span className="text-neutral-500">{t.mentions}</span></span></div>)}
                    {(!sent!.themes || sent!.themes.length === 0) && <p className="py-3 text-sm text-neutral-400">No themes extracted.</p>}
                  </div>
                </div>
              </div>
            </DemoCard>
          )}

          {/* Top posts */}
          <DemoCard className="pdf-break-before">
            <SectionTitle title="Top posts" subtitle="By real engagement this period" />
            <div className="mt-4 flex flex-col divide-y divide-neutral-200">
              {filteredTopPosts.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2"><span className="text-xs font-semibold text-neutral-400">#{i + 1}</span><PlatformChip platform={p.platform} />{p.permalink ? <a href={p.permalink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-neutral-800 hover:text-primary-800 hover:underline">{p.content}</a> : <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>}</div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-600"><span className="flex items-center gap-1 font-medium text-text-dark"><TrendingUp size={12} /> {formatFollowers(p.engagement)}</span><span>❤️ {formatFollowers(p.likes)}</span><span>💬 {formatFollowers(p.comments)}</span>{p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" className="text-primary-800 hover:text-primary-900 print:hidden"><ExternalLink size={13} /></a>}</div>
                </div>
              ))}
              {filteredTopPosts.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">No posts in this period.</p>}
            </div>
          </DemoCard>

          <DemoCard className="flex items-start gap-3 py-4 text-xs text-neutral-500 print:hidden">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-neutral-400" />
            <p>Live from the Meta Graph API. Page reach/impressions and Facebook demographics were removed by Meta — figures shown are everything still available. Use “Export PDF” to save or print a branded report of the current filter.</p>
          </DemoCard>
          <p className="hidden text-center text-xs text-neutral-400 print:block">Generated from live Meta data · {today}</p>
        </div>
      )}
    </div>
  );
}
