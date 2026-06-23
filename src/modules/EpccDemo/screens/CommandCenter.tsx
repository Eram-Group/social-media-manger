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

interface PublicAccount {
  platform: TPlatformId;
  accountId: string;
  name?: string;
  followers?: number;
}

// A rolling 7-day strip ending today (today = 2026-06-23 in this environment).
const WEEK = [
  { date: '2026-06-22', label: 'Mon', d: '22' },
  { date: '2026-06-23', label: 'Tue', d: '23' },
  { date: '2026-06-24', label: 'Wed', d: '24' },
  { date: '2026-06-25', label: 'Thu', d: '25' },
  { date: '2026-06-26', label: 'Fri', d: '26' },
  { date: '2026-06-27', label: 'Sat', d: '27' },
  { date: '2026-06-28', label: 'Sun', d: '28' },
];

const eng = (p: IPost) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);

export default function CommandCenter() {
  const { posts, loading } = usePosts();
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [selected, setSelected] = useState<IPost | null>(null);

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

  const KPIS = [
    { label: 'Connected accounts', value: String(accounts.length) },
    { label: 'Total followers', value: formatFollowers(totalFollowers) },
    { label: 'Published posts', value: String(published.length) },
    { label: 'Total engagement', value: totalEngagement.toLocaleString() },
    { label: 'Comments', value: totalComments.toLocaleString() },
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
          <StatCard key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

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
                    <button key={p.id} onClick={() => setSelected(p)}
                      className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-1.5 text-left transition-shadow hover:shadow-4">
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
