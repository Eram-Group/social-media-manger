'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { DemoCard, SectionTitle, StatCard, PlatformChip, formatFollowers } from '../_components/ui';
import AiInsightStrip from '../_components/AiInsightStrip';
import { usePosts } from '@/mock-server/posts-store';
import { IPost } from '@/mock-server/posts';
import { getPlatform, platformChartColor, TPlatformId } from '@/mock-server/platforms';

const eng = (p: IPost) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);

export default function Reports() {
  const { posts, loading } = usePosts();
  const published = posts.filter((p) => p.status === 'published');

  const totals = useMemo(() => {
    const likes = published.reduce((s, p) => s + (p.likes ?? 0), 0);
    const comments = published.reduce((s, p) => s + (p.comments ?? 0), 0);
    const shares = published.reduce((s, p) => s + (p.shares ?? 0), 0);
    return { likes, comments, shares, engagement: likes + comments + shares };
  }, [published]);

  // Per-platform breakdown (real).
  const byPlatform = useMemo(() => {
    const map = new Map<TPlatformId, { posts: number; engagement: number }>();
    for (const p of published) {
      for (const pl of p.platforms) {
        const cur = map.get(pl) ?? { posts: 0, engagement: 0 };
        cur.posts += 1;
        cur.engagement += eng(p);
        map.set(pl, cur);
      }
    }
    return [...map.entries()].map(([platform, v]) => ({ platform, name: getPlatform(platform).name, ...v }));
  }, [published]);

  const topPosts = [...published].sort((a, b) => eng(b) - eng(a)).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Reports" subtitle="Performance aggregated from your real published posts." />

      <AiInsightStrip
        context="the Chamber's real published-post performance"
        fallback="Publish consistently and lean into the formats that earn the most engagement to grow reach over time."
      />

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Published posts" value={String(published.length)} />
        <StatCard label="Total engagement" value={totals.engagement.toLocaleString()} />
        <StatCard label="Comments" value={totals.comments.toLocaleString()} />
        <StatCard label="Shares" value={totals.shares.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Engagement by platform */}
        <DemoCard className="lg:col-span-2">
          <SectionTitle title="Engagement by platform" subtitle="Across your published posts" />
          <div className="mt-4 h-72">
            {byPlatform.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlatform} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#757575' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#757575' }} />
                  <Tooltip />
                  <Bar dataKey="engagement" radius={[6, 6, 0, 0]}>
                    {byPlatform.map((e, i) => <Cell key={i} fill={platformChartColor(e.platform)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">{loading ? 'Loading…' : 'No published posts yet'}</div>
            )}
          </div>
        </DemoCard>

        {/* Platform table */}
        <DemoCard>
          <SectionTitle title="By platform" />
          <div className="mt-4 flex flex-col divide-y divide-neutral-200">
            {byPlatform.length ? byPlatform.map((e) => (
              <div key={e.platform} className="flex items-center justify-between py-2.5">
                <PlatformChip platform={e.platform} size="sm" withLabel />
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-dark">{e.engagement.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500">{e.posts} post{e.posts === 1 ? '' : 's'}</p>
                </div>
              </div>
            )) : <p className="py-8 text-center text-sm text-neutral-400">—</p>}
          </div>
        </DemoCard>
      </div>

      {/* Top posts */}
      <DemoCard>
        <SectionTitle title="Top posts" subtitle="By real engagement" />
        <div className="mt-4 flex flex-col divide-y divide-neutral-200">
          {topPosts.length ? topPosts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs text-neutral-600">
                <span>❤️ {(p.likes ?? 0).toLocaleString()}</span>
                <span>💬 {(p.comments ?? 0).toLocaleString()}</span>
                <span>↗ {(p.shares ?? 0).toLocaleString()}</span>
              </div>
            </div>
          )) : <p className="py-8 text-center text-sm text-neutral-400">{loading ? 'Loading…' : 'No published posts yet'}</p>}
        </div>
      </DemoCard>
    </div>
  );
}
