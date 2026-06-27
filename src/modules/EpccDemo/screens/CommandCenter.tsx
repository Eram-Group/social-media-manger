'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, StatCard, PlatformChip, StatusPill, formatFollowers } from '../_components/ui';
import { getPlatform, platformColorByName, TPlatformId } from '@/mock-server/platforms';
import AiInsightStrip from '../_components/AiInsightStrip';
import PostSheet from '../_components/PostSheet';
import { usePosts } from '@/mock-server/posts-store';
import { IPost } from '@/mock-server/posts';
import { WEEKDAYS, weekDays, weekLabel, todayYmd } from '../_components/calendar-utils';
import { useApi } from '../_services/useApi';
import { Clock, Megaphone, CalendarClock, ArrowRight, Plus } from 'lucide-react';

interface PublicAccount {
  platform: TPlatformId;
  accountId: string;
  name?: string;
  followers?: number;
}

const eng = (p: IPost) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
const STATUS_COLOR: Record<string, string> = { published: '#00A87E', scheduled: '#025FCC', draft: '#F0C500' };

interface Overview { facebook?: { totals?: { netFollows28d?: number } }[]; instagram?: { stats?: { reach?: number } }[]; bestTimes?: { recommended?: { label: string } | null } | null }
interface Metrics { general?: { avg_engagement_rate_percentage?: number } }

export default function CommandCenter() {
  const { posts, loading } = usePosts();
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [selected, setSelected] = useState<IPost | null>(null);
  const week = useMemo(() => weekDays(new Date()), []);
  const weekTitle = useMemo(() => weekLabel(new Date()), []);
  const weekCount = useMemo(() => { const s = new Set(week.map((d) => d.date)); return posts.filter((p) => s.has(p.date)).length; }, [week, posts]);
  // Rich real signals (already cached server-side).
  const { data: overview } = useApi<Overview>('/api/overview');
  const { data: metrics } = useApi<Metrics>('/api/metrics');

  useEffect(() => {
    fetch('/api/accounts', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => setAccounts([]));
  }, []);

  const published = posts.filter((p) => p.status === 'published');
  const scheduled = posts.filter((p) => p.status === 'scheduled');
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);
  const totalEngagement = published.reduce((s, p) => s + eng(p), 0);
  const totalComments = published.reduce((s, p) => s + (p.comments ?? 0), 0);

  // Followers aggregated by platform (real).
  const followersByPlatform = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      const name = getPlatform(a.platform).name;
      map.set(name, (map.get(name) ?? 0) + (a.followers ?? 0));
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [accounts]);

  const topPosts = [...published].sort((a, b) => eng(b) - eng(a)).slice(0, 5);
  const recent = published.slice(0, 5);

  // Real signals from the cached endpoints.
  const net28 = overview?.facebook?.[0]?.totals?.netFollows28d ?? null;
  const igReach = overview?.instagram?.[0]?.stats?.reach ?? null;
  const engRate = metrics?.general?.avg_engagement_rate_percentage ?? null;
  const bestTime = overview?.bestTimes?.recommended?.label ?? null;
  const growthDelta = net28 != null && totalFollowers ? Math.round((net28 / totalFollowers) * 1000) / 10 : undefined;
  const today = todayYmd();
  const dueToday = scheduled.filter((p) => p.date === today);

  const KPIS: { label: string; value: string; delta?: number }[] = [
    { label: 'Total followers', value: formatFollowers(totalFollowers) },
    { label: 'Net follows · 28d', value: net28 != null ? (net28 >= 0 ? `+${net28}` : String(net28)) : '—', delta: growthDelta },
    { label: 'Engagement rate', value: engRate != null ? `${engRate}%` : '—' },
    { label: 'Reach · 28d', value: igReach != null ? formatFollowers(igReach) : '—' },
    { label: 'Published posts', value: String(published.length) },
    { label: 'Scheduled', value: String(scheduled.length) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Command Center" subtitle="Live overview of your connected accounts and real published posts." />

      <AiInsightStrip
        context="the Chamber's connected social accounts and recent real posts"
        fallback="Connect more accounts and publish posts to grow your reach. Engagement compounds when you post consistently in the evenings."
      />

      {accounts.length === 0 && (
        <DemoCard className="flex items-center justify-between gap-3 border-primary-300 bg-primary-100/50">
          <p className="text-sm text-primary-900">No accounts connected yet — connect one to see real data here.</p>
          <a href="/epcc-demo/accounts" className="shrink-0 rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect account →</a>
        </DemoCard>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} />
        ))}
      </div>

      {/* Recommended actions — turns the dashboard into a next-step coach */}
      {(bestTime || topPosts.length > 0 || dueToday.length > 0) && (
        <DemoCard>
          <SectionTitle title="Recommended next actions" subtitle="Based on your real performance" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {bestTime && (
              <a href="/epcc-demo/composer" className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-3 hover:border-primary-300 hover:bg-primary-100/40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-200 text-primary-800"><Clock size={17} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark">Post at your best time</p>
                  <p className="text-xs text-neutral-500">Your audience engages most around <span className="font-medium text-primary-800">{bestTime}</span>. Schedule your next post then.</p>
                </div>
                <ArrowRight size={15} className="ml-auto shrink-0 text-neutral-300 group-hover:text-primary-800" />
              </a>
            )}
            {topPosts.length > 0 && (
              <a href={`/epcc-demo/promotion?post=${encodeURIComponent(topPosts[0].id)}`} className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-3 hover:border-primary-300 hover:bg-primary-100/40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-200 text-primary-800"><Megaphone size={17} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-dark">Boost your top post</p>
                  <p className="truncate text-xs text-neutral-500">“{topPosts[0].content.slice(0, 48)}” is your best performer — put budget behind it.</p>
                </div>
                <ArrowRight size={15} className="ml-auto shrink-0 text-neutral-300 group-hover:text-primary-800" />
              </a>
            )}
            <a href="/epcc-demo/calendar" className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-3 hover:border-primary-300 hover:bg-primary-100/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-200 text-primary-800"><CalendarClock size={17} /></span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-dark">{dueToday.length > 0 ? `${dueToday.length} scheduled for today` : 'Plan the week ahead'}</p>
                <p className="text-xs text-neutral-500">{dueToday.length > 0 ? 'Review what goes out today in the calendar.' : 'Fill gaps so you post consistently.'}</p>
              </div>
              <ArrowRight size={15} className="ml-auto shrink-0 text-neutral-300 group-hover:text-primary-800" />
            </a>
          </div>
        </DemoCard>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Followers by platform (real) */}
        <DemoCard className="xl:col-span-2">
          <SectionTitle title="Followers by platform" subtitle="From your connected accounts" />
          <div className="mt-4 h-72">
            {followersByPlatform.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followersByPlatform} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#757575' }} width={80} />
                  <Tooltip formatter={(v: number) => formatFollowers(v)} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {followersByPlatform.map((entry, i) => (
                      <Cell key={i} fill={platformColorByName(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">No connected accounts yet</div>
            )}
          </div>
        </DemoCard>

        {/* Top posts by engagement (real) */}
        <DemoCard>
          <SectionTitle title="Top posts" subtitle="By real engagement" />
          <div className="mt-4 flex flex-col divide-y divide-neutral-200">
            {topPosts.length ? topPosts.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className="flex items-center justify-between gap-3 py-2.5 text-left hover:bg-neutral-100/60">
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>
                <span className="shrink-0 text-xs font-medium text-neutral-600">{eng(p).toLocaleString()} eng</span>
              </button>
            )) : <p className="py-8 text-center text-sm text-neutral-400">{loading ? 'Loading…' : 'No published posts yet'}</p>}
          </div>
        </DemoCard>

        {/* This week */}
        <DemoCard className="xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle title="This week" subtitle={`${weekTitle} · ${weekCount} post${weekCount === 1 ? '' : 's'} · click a post for details`} />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.published }} /> Live</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.scheduled }} /> Scheduled</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.draft }} /> Draft</span>
              </div>
              <a href="/epcc-demo/calendar" className="text-sm font-medium text-primary-800 hover:underline">Open calendar →</a>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {week.map((day) => {
              const dayPosts = posts.filter((p) => p.date === day.date);
              return (
                <div key={day.date} className={cn('group flex min-h-[140px] flex-col gap-1.5 rounded-lg border p-2', day.today ? 'border-primary-300 bg-primary-100/40' : 'border-neutral-200 bg-neutral-100/40')}>
                  <div className="flex items-center justify-between px-0.5">
                    <span className={cn('text-xs font-medium', day.today ? 'text-primary-800' : 'text-neutral-500')}>{WEEKDAYS[day.weekday]}{day.today && ' · Today'}</span>
                    <div className="flex items-center gap-1">
                      {dayPosts.length > 0 && <span className="rounded-full bg-neutral-200 px-1.5 text-[10px] font-medium text-neutral-600">{dayPosts.length}</span>}
                      <span className="font-Sora text-sm font-semibold text-text-dark">{day.day}</span>
                      <a href={`/epcc-demo/posts?create=1&date=${day.date}`} title="New post" className="text-neutral-400 opacity-0 transition-opacity hover:text-primary-800 group-hover:opacity-100"><Plus size={13} /></a>
                    </div>
                  </div>
                  {dayPosts.slice(0, 3).map((p) => (
                    <button key={p.id} onClick={() => setSelected(p)} style={{ borderLeftColor: STATUS_COLOR[p.status] ?? '#9CA3AF' }}
                      className="flex flex-col gap-1 rounded-md border border-l-[3px] border-neutral-200 bg-white p-1.5 text-left transition-shadow hover:shadow-4">
                      <span className="text-[10px] font-medium text-neutral-500">{p.time || '—'}</span>
                      <span className="line-clamp-2 text-[11px] leading-tight text-neutral-800">{p.content}</span>
                      <span className="flex items-center gap-0.5">
                        {p.platforms.slice(0, 4).map((pl) => <PlatformChip key={pl} platform={pl} />)}
                      </span>
                    </button>
                  ))}
                  {dayPosts.length > 3 && <a href="/epcc-demo/calendar" className="px-1 text-[10px] font-medium text-primary-700 hover:underline">+{dayPosts.length - 3} more</a>}
                  {dayPosts.length === 0 && <span className="px-0.5 text-[11px] text-neutral-400">—</span>}
                </div>
              );
            })}
          </div>
        </DemoCard>

        {/* Recently published (real) */}
        <DemoCard className="xl:col-span-3">
          <SectionTitle title="Recently published" subtitle="Click a post to view full analytics" />
          <div className="mt-4 flex flex-col divide-y divide-neutral-200">
            {recent.length ? recent.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)}
                className="flex items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-neutral-100/60">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <StatusPill tone="success">live</StatusPill>
                  <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>
                </div>
                <div className="flex items-center gap-1">
                  {p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}
                </div>
                <span className="w-28 text-right text-sm font-medium text-neutral-700">
                  {eng(p).toLocaleString()} engagement
                </span>
              </button>
            )) : <p className="py-8 text-center text-sm text-neutral-400">{loading ? 'Loading…' : 'No published posts yet'}</p>}
          </div>
        </DemoCard>
      </div>

      <PostSheet post={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
