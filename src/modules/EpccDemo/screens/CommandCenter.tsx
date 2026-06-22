import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useState } from 'react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, StatCard, PlatformChip, StatusPill } from '../_components/ui';
import { platformColorByName } from '@/mock-server/platforms';
import AiInsightStrip from '../_components/AiInsightStrip';
import PostSheet from '../_components/PostSheet';
import { KPIS, TREND, FOLLOWERS_BY_PLATFORM } from '@/mock-server/kpis';
import { usePosts } from '@/mock-server/posts-store';
import { IPost } from '@/mock-server/posts';
import { formatFollowers } from '../_components/ui';

const WEEK = [
  { date: '2026-06-22', label: 'Mon', d: '22' },
  { date: '2026-06-23', label: 'Tue', d: '23' },
  { date: '2026-06-24', label: 'Wed', d: '24' },
  { date: '2026-06-25', label: 'Thu', d: '25' },
  { date: '2026-06-26', label: 'Fri', d: '26' },
  { date: '2026-06-27', label: 'Sat', d: '27' },
  { date: '2026-06-28', label: 'Sun', d: '28' },
];

export default function CommandCenter() {
  const { posts } = usePosts();
  const recent = posts.filter((p) => p.status === 'published').slice(0, 4);
  const [selected, setSelected] = useState<IPost | null>(null);

  // Live KPI derived from the shared store, so scheduling/publishing/deleting a
  // post immediately updates the dashboard (everything stays connected).
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const liveKpis = KPIS.map((k) => (k.key === 'scheduled' ? { ...k, value: String(scheduledCount) } : k));

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        title="Command Center"
        subtitle="One unified view across X, Instagram, LinkedIn, Facebook, Snapchat and TikTok."
      />

      <AiInsightStrip
        context="this month's overall social performance across all six platforms for the Chamber"
        fallback="Reach is up 11% month-over-month, led by short-form video. Double down on TikTok/Instagram reels and keep the Investment Forum campaign running through registration close."
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {liveKpis.map((k) => (
          <StatCard key={k.key} label={k.label} value={k.value} delta={k.delta} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Trend */}
        <DemoCard className="xl:col-span-2">
          <SectionTitle title="Reach & engagement" subtitle="Last 8 months" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="reachFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#025FCC" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#025FCC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#757575' }} />
                <YAxis tick={{ fontSize: 12, fill: '#757575' }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="reach"
                  name="Reach (M)"
                  stroke="#025FCC"
                  strokeWidth={2}
                  fill="url(#reachFill)"
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  name="Engagement (%)"
                  stroke="#00A87E"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DemoCard>

        {/* Followers by platform */}
        <DemoCard>
          <SectionTitle title="Followers by platform" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={FOLLOWERS_BY_PLATFORM}
                layout="vertical"
                margin={{ left: 20, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#757575' }}
                  width={70}
                />
                <Tooltip formatter={(v: number) => formatFollowers(v)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {FOLLOWERS_BY_PLATFORM.map((entry, i) => (
                    <Cell key={i} fill={platformColorByName(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DemoCard>

      {/* This week — calendar strip */}
      <DemoCard className="xl:col-span-3">
        <div className="flex items-center justify-between">
          <SectionTitle title="This week" subtitle="22–28 June 2026 · click a post for details" />
          <a href="/epcc-demo/calendar" className="text-sm font-medium text-primary-800 hover:underline">Open calendar →</a>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEK.map((day) => {
            const dayPosts = posts.filter((p) => p.date === day.date);
            return (
              <div key={day.date} className="flex min-h-[130px] flex-col gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100/40 p-2">
                <div className="flex items-baseline justify-between px-0.5">
                  <span className="text-xs font-medium text-neutral-500">{day.label}</span>
                  <span className="font-Sora text-sm font-semibold text-text-dark">{day.d}</span>
                </div>
                {dayPosts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={cn('flex flex-col gap-1 rounded-md border bg-white p-1.5 text-left transition-shadow hover:shadow-4',
                      p.type === 'reminder' ? 'border-accent-700' : 'border-neutral-200')}>
                    <span className="text-[10px] font-medium text-neutral-500">{p.time}</span>
                    <span className="line-clamp-2 text-[11px] leading-tight text-neutral-800">{p.content}</span>
                    <span className="flex items-center gap-0.5">
                      {p.platforms.slice(0, 4).map((pl) => <PlatformChip key={pl} platform={pl} />)}
                    </span>
                  </button>
                ))}
                {dayPosts.length === 0 && <span className="px-0.5 text-[11px] text-neutral-400">—</span>}
              </div>
            );
          })}
        </div>
      </DemoCard>

      {/* Recently published */}
      <DemoCard className="xl:col-span-3">
        <SectionTitle title="Recently published" subtitle="Click a post to view full analytics" />
        <div className="mt-4 flex flex-col divide-y divide-neutral-200">
          {recent.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)}
              className="flex items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-neutral-100/60">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <StatusPill tone="success">live</StatusPill>
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>
              </div>
              <div className="flex items-center gap-1">
                {p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}
              </div>
              <span className="w-24 text-right text-sm font-medium text-neutral-700">
                {p.reach ? `${formatFollowers(p.reach)} reach` : '—'}
              </span>
            </button>
          ))}
        </div>
      </DemoCard>
      </div>

      <PostSheet post={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
