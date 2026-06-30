# Richer Analytics + Skeleton Loading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace cold-load loading states with layout-matched skeletons and add richer charts across all six analytics screens, with the top charts folded into the PDF export.

**Architecture:** Two reusable systems in the design-system layer — skeleton primitives + `ChartCard` in `ui.tsx`, and a `charts.tsx` Recharts catalog — then applied screen-by-screen. One additive backend change exposes a daily `series` on `/api/overview` for trend charts. All chart code lives in the catalog (DRY); per-screen tasks only map data into it.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind 3.4 (brand tokens), Recharts 2.15, `@react-pdf/renderer` 4.5.

## Global Constraints

- Tailwind brand tokens only, no raw hex in components (charts may use `CHART_COLORS`/`GENDER_COLORS` hex constants from `ui.tsx`). Verbatim palette: `CHART_COLORS = ['#025FCC','#4ED6FC','#F0C500','#00A87E','#649DE0','#01397A']`; `GENDER_COLORS = ['#025FCC','#DB2777','#9CA3AF']`; grid stroke `#E3E3E3`; axis tick fill `#757575`.
- Skeletons show only on cold load (`loading && !data`); cached revisits stay instant (do not change `useApi` cache behavior); the manual Refresh button keeps its `RefreshCw animate-spin` and leaves existing content visible.
- Empty series render the `ChartCard` empty state — never fabricate data (Meta has deprecated FB Page reach, FB demographics, per-post reach).
- Shared UI imports come from `'../_components/ui'`; chart catalog from `'../_components/charts'`; `cn()` from `@/shadecn/lib/utils`.
- Naming: interfaces `IXxx`, types `TXxx`, enums `EXxx`. Components are PascalCase.
- Verification per task: `npm run typecheck` must pass (no test runner in this project); `npm run build` at milestones; manual checks as noted. No unit-test framework is added (YAGNI).
- Branch: `feat/richer-analytics-skeletons` (already created; spec already committed).

---

## File Structure

**New**
- `src/modules/EpccDemo/_components/charts.tsx` — Recharts catalog: `ChartDatum`, `DonutChart`, `TrendAreaChart`, `TrendLineChart`, `CategoryBarChart`, `ScatterPlot`, `mergeHistories`.

**Modified**
- `src/modules/EpccDemo/_components/ui.tsx` — skeleton primitives + `ChartCard` + export `GENDER_COLORS`.
- `app/api/overview/route.ts` — add daily `series`/`daily` field to each FB account view.
- `src/modules/EpccDemo/screens/CommandCenter.tsx`
- `src/modules/EpccDemo/screens/AnalyticsHub.tsx`
- `src/modules/EpccDemo/screens/GrowthInsights.tsx`
- `src/modules/EpccDemo/screens/AudienceInsights.tsx`
- `src/modules/EpccDemo/screens/Competitors.tsx`
- `src/modules/EpccDemo/screens/PostDetail.tsx`
- `src/modules/EpccDemo/screens/Inbox.tsx`, `PostsAnalytics.tsx`, `Accounts.tsx` — skeleton-only.
- `src/modules/EpccDemo/_components/AnalyticsPdf.tsx` — add top charts.

---

## Task 1: Skeleton primitives in `ui.tsx`

**Files:**
- Modify: `src/modules/EpccDemo/_components/ui.tsx` (append after `CHART_COLORS`, line 107)

**Interfaces:**
- Produces: `Skeleton`, `SkeletonText`, `StatCardSkeleton`, `ChartSkeleton`, `ListRowSkeleton`, `TableRowSkeleton` (all `React.FC`); `GENDER_COLORS: string[]`.

- [ ] **Step 1: Add the primitives + `GENDER_COLORS`**

Append to `ui.tsx`:

```tsx
// Shared gender palette (was duplicated per-screen).
export const GENDER_COLORS = ['#025FCC', '#DB2777', '#9CA3AF'];

// ── Skeleton loaders ────────────────────────────────────────────────────────
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('animate-pulse rounded-md bg-neutral-200/70', className)} {...props} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <DemoCard className="p-5">
    <Skeleton className="h-3.5 w-24" />
    <Skeleton className="mt-3 h-7 w-20" />
    <Skeleton className="mt-2 h-3 w-28" />
  </DemoCard>
);

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 240 }) => (
  <DemoCard>
    <Skeleton className="h-4 w-40" />
    <Skeleton className="mt-1.5 h-3 w-56" />
    <Skeleton className="mt-5 w-full rounded-lg" style={{ height }} />
  </DemoCard>
);

export const ListRowSkeleton: React.FC<{ withMedia?: boolean }> = ({ withMedia = true }) => (
  <div className="flex items-center gap-3 py-3">
    {withMedia && <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />}
    <div className="flex-1">
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <div className="flex items-center gap-4 py-3">
    {Array.from({ length: cols }).map((_, i) => (
      <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-40' : 'flex-1')} />
    ))}
  </div>
);
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/modules/EpccDemo/_components/ui.tsx
git commit -m "feat: add skeleton primitives + shared GENDER_COLORS to ui"
```

---

## Task 2: Chart catalog `charts.tsx` + `ChartCard`

**Files:**
- Create: `src/modules/EpccDemo/_components/charts.tsx`
- Modify: `src/modules/EpccDemo/_components/ui.tsx` (add `ChartCard` after `DemoCard`)

**Interfaces:**
- Consumes: `CHART_COLORS`, `GENDER_COLORS` from `./ui` (Task 1).
- Produces:
  - `ChartCard({ title, subtitle?, right?, height?, isEmpty?, emptyLabel?, children })` (in `ui.tsx`)
  - `ChartDatum = { label: string; value: number }`
  - `DonutChart({ data: ChartDatum[], colors?, center?: { label: string; value: string } })`
  - `TrendAreaChart({ data: any[], xKey?: string, yKey?: string, color?: string })`
  - `TrendLineChart({ data: any[], xKey?: string, series: { key: string; name: string; color?: string }[] })`
  - `CategoryBarChart({ data: ChartDatum[], color?: string, horizontal?: boolean })`
  - `ScatterPlot({ data: { x: number; y: number; name: string }[], xName: string, yName: string })`
  - `mergeHistories(rows: { name: string; history: { takenAt: number; followers: number }[] }[]): any[]`

- [ ] **Step 1: Add `ChartCard` to `ui.tsx`** (after `DemoCard`, before `SectionTitle`)

```tsx
export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, right, height = 240, isEmpty, emptyLabel = 'No data yet', children }) => (
  <DemoCard>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-Sora text-base font-semibold text-text-dark">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="mt-4" style={{ height }}>
      {isEmpty ? (
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">{emptyLabel}</div>
      ) : (
        children
      )}
    </div>
  </DemoCard>
);
```

- [ ] **Step 2: Create `charts.tsx`**

```tsx
'use client';

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { CHART_COLORS } from './ui';

const GRID = '#E3E3E3';
const TICK = '#757575';
const axis = { tick: { fill: TICK, fontSize: 11 }, tickLine: false, axisLine: false } as const;

export interface ChartDatum {
  label: string;
  value: number;
}

export const DonutChart: React.FC<{
  data: ChartDatum[];
  colors?: string[];
  center?: { label: string; value: string };
}> = ({ data, colors = CHART_COLORS, center }) => (
  <div className="relative h-full w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
    {center && (
      <div className="pointer-events-none absolute inset-0 -mt-6 flex flex-col items-center justify-center">
        <span className="font-Sora text-xl font-semibold text-text-dark">{center.value}</span>
        <span className="text-xs text-neutral-500">{center.label}</span>
      </div>
    )}
  </div>
);

export const TrendAreaChart: React.FC<{
  data: any[]; xKey?: string; yKey?: string; color?: string;
}> = ({ data, xKey = 'date', yKey = 'net', color = CHART_COLORS[0] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
      <defs>
        <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      <XAxis dataKey={xKey} {...axis} />
      <YAxis {...axis} />
      <Tooltip />
      <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#grad-${yKey})`} />
    </AreaChart>
  </ResponsiveContainer>
);

export const TrendLineChart: React.FC<{
  data: any[]; xKey?: string; series: { key: string; name: string; color?: string }[];
}> = ({ data, xKey = 'date', series }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      <XAxis dataKey={xKey} {...axis} />
      <YAxis {...axis} />
      <Tooltip />
      {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
      {series.map((s, i) => (
        <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
          stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

export const CategoryBarChart: React.FC<{
  data: ChartDatum[]; color?: string; horizontal?: boolean;
}> = ({ data, color = CHART_COLORS[0], horizontal = false }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}
      margin={{ top: 4, right: 8, left: horizontal ? 8 : -16, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      {horizontal ? <XAxis type="number" {...axis} /> : <XAxis type="category" dataKey="label" {...axis} />}
      {horizontal ? <YAxis type="category" dataKey="label" width={90} {...axis} /> : <YAxis type="number" {...axis} />}
      <Tooltip />
      <Bar dataKey="value" fill={color} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const ScatterPlot: React.FC<{
  data: { x: number; y: number; name: string }[]; xName: string; yName: string;
}> = ({ data, xName, yName }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ScatterChart margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
      <XAxis type="number" dataKey="x" name={xName} {...axis} />
      <YAxis type="number" dataKey="y" name={yName} {...axis} />
      <ZAxis range={[60, 60]} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Scatter data={data} fill={CHART_COLORS[0]} />
    </ScatterChart>
  </ResponsiveContainer>
);

// Merge per-competitor follower histories into a single date-keyed series for a
// multi-line chart. Each output row: { date, [competitorName]: followers }.
export function mergeHistories(
  rows: { name: string; history: { takenAt: number; followers: number }[] }[],
): any[] {
  const byDate = new Map<string, any>();
  for (const r of rows) {
    for (const h of r.history) {
      const date = new Date(h.takenAt).toISOString().slice(0, 10);
      const row = byDate.get(date) ?? { date };
      row[r.name] = h.followers;
      byDate.set(date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS. (Build confirms Recharts named imports resolve.)

- [ ] **Step 4: Commit**

```bash
git add src/modules/EpccDemo/_components/charts.tsx src/modules/EpccDemo/_components/ui.tsx
git commit -m "feat: add ChartCard + reusable chart catalog (charts.tsx)"
```

---

## Task 3: Expose daily `series` on `/api/overview`

**Files:**
- Modify: `app/api/overview/route.ts` (FB account view block, around lines 56-105)

**Interfaces:**
- Produces: each FB account view gains `daily: { date: string; engagements: number; pageViews: number; videoViews: number }[]`, aligned to the existing `growth[]` dates.

- [ ] **Step 1: Read the route's FB series block**

Run: `sed -n '56,110p' app/api/overview/route.ts`
Confirm: `series.page_post_engagements`, `series.page_views_total`, `series.page_video_views` exist and `view.growth` is built from `series.page_daily_follows_unique` end_times.

- [ ] **Step 2: Build and attach `daily`** (add where `view.totals` is assigned, ~line 91)

Add the initial empty default to the placeholder view (line 58, alongside `growth: [], totals: {}`):

```ts
    daily: [],
```

Then, after `view.growth = ...` is computed, add:

```ts
    const eng = series.page_post_engagements ?? [];
    const pv = series.page_views_total ?? [];
    const vv = series.page_video_views ?? [];
    view.daily = (series.page_daily_follows_unique ?? []).map((a, i) => ({
      date: (a.end_time ?? '').slice(0, 10),
      engagements: Number(eng[i]?.value ?? 0),
      pageViews: Number(pv[i]?.value ?? 0),
      videoViews: Number(vv[i]?.value ?? 0),
    }));
```

(If the FB view has a declared TS interface in this file, add `daily: { date: string; engagements: number; pageViews: number; videoViews: number }[]` to it. If views are untyped objects, no type change needed.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verify (if a Meta account + DATABASE_URL are configured)**

Run: `npm run dev`, then in a browser open `http://localhost:3000/api/overview?refresh=1`.
Expected: each `facebook[]` entry includes a `daily` array of `{date, engagements, pageViews, videoViews}`. (If no account connected, `available:false` — acceptable; charts will use empty state.)

- [ ] **Step 5: Commit**

```bash
git add app/api/overview/route.ts
git commit -m "feat: expose daily engagement/views series on /api/overview"
```

---

## Task 4: CommandCenter — skeletons + charts

**Files:**
- Modify: `src/modules/EpccDemo/screens/CommandCenter.tsx`

**Interfaces:**
- Consumes: `ChartCard`, `ChartSkeleton`, `ListRowSkeleton` from `../_components/ui`; `DonutChart`, `TrendLineChart`, `CategoryBarChart` from `../_components/charts`.

- [ ] **Step 1: Extend imports + the `Overview` inline type**

Add to the `../_components/ui` import: `ChartCard, ChartSkeleton, ListRowSkeleton`.
Add a new import line: `import { DonutChart, TrendLineChart, CategoryBarChart } from '../_components/charts';`
Extend the inline `Overview` type (line ~26) so the FB entry exposes the fields used:

```ts
type Overview = {
  available?: boolean;
  facebook?: { followers?: number; growth?: { date: string; net: number }[];
    daily?: { date: string; engagements: number }[];
    contentMix?: { label: string; value: number }[];
    totals?: { netFollows28d?: number } }[];
  instagram?: { stats?: { reach?: number } }[];
  bestTimes?: { recommended?: { label?: string } | null } | null;
};
```

- [ ] **Step 2: Derive chart data** (near `followersByPlatform`, line ~54)

```ts
  const fb = overview?.facebook?.[0];
  const growth = (fb?.growth ?? []).map((g) => ({ date: g.date?.slice(5), net: g.net }));
  const engTrend = (fb?.daily ?? []).map((d) => ({ date: d.date?.slice(5), engagements: d.engagements }));
  const contentMix = (fb?.contentMix ?? []).map((c) => ({ label: c.label, value: c.value }));
```

- [ ] **Step 3: Replace the "Followers by platform" Bar (lines 150-161) with a `ChartCard` + `DonutChart`**

```tsx
        <ChartCard title="Followers by platform" height={260}
          isEmpty={!followersByPlatform.length} emptyLabel="No connected accounts yet">
          <DonutChart data={followersByPlatform} />
        </ChartCard>
```

- [ ] **Step 4: Add three chart cards** (in the same grid region as the followers chart)

```tsx
        <ChartCard title="Follower growth" subtitle="Net new followers / day"
          isEmpty={!growth.length} emptyLabel="No follower data yet">
          <TrendLineChart data={growth} series={[{ key: 'net', name: 'Net' }]} />
        </ChartCard>
        <ChartCard title="Engagement trend" subtitle="Daily post engagements"
          isEmpty={!engTrend.length}>
          <TrendLineChart data={engTrend} series={[{ key: 'engagements', name: 'Engagements' }]} />
        </ChartCard>
        <ChartCard title="Content mix" isEmpty={!contentMix.length}>
          <CategoryBarChart data={contentMix} />
        </ChartCard>
```

- [ ] **Step 5: Skeleton the post lists** — replace the two `{loading ? 'Loading…' : 'No published posts yet'}` (lines 177, 243):

```tsx
              {loading ? (
                <div>{Array.from({ length: 4 }).map((_, i) => <ListRowSkeleton key={i} />)}</div>
              ) : (
                <p className="py-8 text-center text-sm text-neutral-400">No published posts yet</p>
              )}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Manual verify**

Run `npm run dev`, open `/epcc-demo/command-center`. Cold load shows skeleton rows in the feeds; charts render (or empty states if no Meta data). No console errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/EpccDemo/screens/CommandCenter.tsx
git commit -m "feat: richer charts + skeletons on Command Center"
```

---

## Task 5: AnalyticsHub — skeletons + charts (PDF data source)

**Files:**
- Modify: `src/modules/EpccDemo/screens/AnalyticsHub.tsx`

**Interfaces:**
- Consumes: `ChartCard`, `ChartSkeleton`, `StatCardSkeleton`, `GENDER_COLORS` from `../_components/ui`; `DonutChart`, `TrendLineChart`, `CategoryBarChart` from `../_components/charts`.
- Produces: a `chartData` object (reactions/engByPlatform/reachTrend/topPostsBar) reused by Task 11 (PDF).

- [ ] **Step 1: Extend imports**

Add to `../_components/ui` import: `ChartCard, ChartSkeleton, StatCardSkeleton, GENDER_COLORS`.
Add: `import { DonutChart, TrendLineChart, CategoryBarChart } from '../_components/charts';`
Remove the local `GENDER_COLORS` declaration (line ~35) now that it's imported.

- [ ] **Step 2: Derive chart data** (after `fbOv`/`igOv`/`kpis`, line ~80)

```ts
  const reactionsData = Object.entries(fbOv?.reactions ?? {}).map(([label, value]) => ({ label, value: Number(value) }));
  const engByPlatform = (report?.platforms ?? []).map((p) => ({
    label: p.name ?? p.platform,
    value: Number((p.stats as any)?.engagement_rate_percentage ?? (p.stats as any)?.engagements28d ?? 0),
  }));
  const reachTrend = (fbOv?.daily ?? []).map((d: any) => ({ date: d.date?.slice(5), pageViews: d.pageViews, videoViews: d.videoViews }));
  const topPostsBar = (filteredTopPosts ?? []).slice(0, 6).map((p: any, i: number) => ({ label: `#${i + 1}`, value: Number(p.engagement ?? 0) }));
```

(Add `daily?: { date: string; pageViews: number; videoViews: number }[]` to the `FbOv` type, line ~26.)

- [ ] **Step 3: Replace the loading branch (line 188) with a skeleton layout**

```tsx
        loading && !report ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
            </div>
          </div>
        ) : !report ? (
```

- [ ] **Step 4: Add the new chart cards** (in the charts grid, alongside the existing follower-growth/content-mix)

```tsx
          <ChartCard title="Reactions" isEmpty={!reactionsData.length}>
            <DonutChart data={reactionsData} />
          </ChartCard>
          <ChartCard title="Engagement by platform" isEmpty={!engByPlatform.length}>
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
```

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Manual verify**

`/epcc-demo/analytics` cold load shows the skeleton (4 stat cards + 4 chart blocks); charts render after data; period switch still works.

- [ ] **Step 7: Commit**

```bash
git add src/modules/EpccDemo/screens/AnalyticsHub.tsx
git commit -m "feat: richer charts + skeletons on Analytics Hub"
```

---

## Task 6: GrowthInsights — skeletons + charts

**Files:**
- Modify: `src/modules/EpccDemo/screens/GrowthInsights.tsx`

**Interfaces:**
- Consumes: `ChartCard`, `StatCardSkeleton`, `ChartSkeleton` from `../_components/ui`; `CategoryBarChart`, `TrendLineChart`, `ScatterPlot` from `../_components/charts`.

- [ ] **Step 1: Extend imports + `FbView` type**

Add to `../_components/ui` import: `ChartCard, StatCardSkeleton, ChartSkeleton`.
Add: `import { CategoryBarChart, TrendLineChart, ScatterPlot } from '../_components/charts';`
Add `daily?: { date: string; engagements: number }[]` to the `FbView` type (line ~15).

- [ ] **Step 2: Derive data** (after `fb`/`ig`/`bt`, line ~59)

```ts
  const netNew = (fb?.growth ?? []).map((g) => ({ label: g.date?.slice(5), value: g.net }));
  const engTrend = (fb?.daily ?? []).map((d) => ({ date: d.date?.slice(5), engagements: d.engagements }));
  const perf = (fb?.topPosts ?? []).map((p) => ({ x: p.eng, y: p.comments, name: (p.message ?? '').slice(0, 24) }));
```

- [ ] **Step 3: Replace loading branch (line 89) with skeleton**

```tsx
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
```

- [ ] **Step 4: Add chart cards** (in the charts region, after existing growth/content-mix)

```tsx
          <ChartCard title="Net new followers" subtitle="Per day" isEmpty={!netNew.length}>
            <CategoryBarChart data={netNew} />
          </ChartCard>
          <ChartCard title="Engagement trend" subtitle="Daily post engagements" isEmpty={!engTrend.length}>
            <TrendLineChart data={engTrend} series={[{ key: 'engagements', name: 'Engagements' }]} />
          </ChartCard>
          <ChartCard title="Post performance" subtitle="Engagement vs comments" isEmpty={!perf.length}>
            <ScatterPlot data={perf} xName="Engagement" yName="Comments" />
          </ChartCard>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Manual verify** — `/epcc-demo/growth` cold load shows skeleton; charts render; heatmap unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/modules/EpccDemo/screens/GrowthInsights.tsx
git commit -m "feat: richer charts + skeletons on Growth Insights"
```

---

## Task 7: AudienceInsights — skeletons + charts

**Files:**
- Modify: `src/modules/EpccDemo/screens/AudienceInsights.tsx`

**Interfaces:**
- Consumes: `ChartCard`, `ChartSkeleton`, `GENDER_COLORS` from `../_components/ui`; `DonutChart`, `CategoryBarChart` from `../_components/charts`.

- [ ] **Step 1: Extend imports**

Add to `../_components/ui` import: `ChartCard, ChartSkeleton, GENDER_COLORS`.
Add: `import { DonutChart, CategoryBarChart } from '../_components/charts';`
Remove the local `GENDER_COLORS` (line ~13).

- [ ] **Step 2: Derive data** (after `ig`/`fb`, line ~29)

```ts
  const ageData = (ig?.age ?? []).map((d) => ({ label: d.label, value: d.value }));
  const genderData = (ig?.gender ?? []).map((d) => ({ label: d.label, value: d.value }));
  const countryData = (ig?.countries ?? []).slice(0, 8).map((d) => ({ label: d.label, value: d.value }));
```

- [ ] **Step 3: Change the loading gate (line 47-48) to `loading && !raw` + skeleton**

```tsx
      {loading && !raw ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      ) : !data.available ? (
```

- [ ] **Step 4: Replace the age `BarChart` (lines 117-125), gender `PieChart` (131-138), and country CSS bars (150-158) with `ChartCard` wrappers**

```tsx
            <ChartCard title="Age distribution" isEmpty={!ageData.length}>
              <CategoryBarChart data={ageData} />
            </ChartCard>
            <ChartCard title="Gender" isEmpty={!genderData.length}>
              <DonutChart data={genderData} colors={GENDER_COLORS} />
            </ChartCard>
            <ChartCard title="Top countries" isEmpty={!countryData.length}>
              <CategoryBarChart data={countryData} horizontal />
            </ChartCard>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Manual verify** — `/epcc-demo/audience` cold load shows 3 chart skeletons; switching IG/FB tabs still works; empty states for FB (no demographics).

- [ ] **Step 7: Commit**

```bash
git add src/modules/EpccDemo/screens/AudienceInsights.tsx
git commit -m "feat: richer charts + skeletons on Audience Insights"
```

---

## Task 8: Competitors — skeletons + charts

**Files:**
- Modify: `src/modules/EpccDemo/screens/Competitors.tsx`

**Interfaces:**
- Consumes: `ChartCard`, `TableRowSkeleton` from `../_components/ui`; `DonutChart`, `CategoryBarChart`, `TrendLineChart`, `mergeHistories` from `../_components/charts`.

- [ ] **Step 1: Add imports** (this file has no Recharts import; the catalog encapsulates Recharts)

Add to `../_components/ui` import: `ChartCard, TableRowSkeleton`.
Add: `import { DonutChart, CategoryBarChart, TrendLineChart, mergeHistories } from '../_components/charts';`

- [ ] **Step 2: Derive data** (after `tracked`/`sov`, lines ~92/197)

```ts
  const engBar = tracked.map((t) => ({ label: t.name, value: Number(t.engagementRate ?? 0) }));
  const sovData = (sov ?? []).map((s: any) => ({ label: s.name ?? s.label, value: Number(s.followers ?? s.value ?? 0) }));
  const topTracked = [...tracked].sort((a, b) => b.followers - a.followers).slice(0, 5);
  const trendData = mergeHistories(topTracked.map((t) => ({ name: t.name, history: t.history })));
  const trendSeries = topTracked.map((t) => ({ key: t.name, name: t.name }));
```

- [ ] **Step 3: Replace the loading branch (line 354) with table-row skeletons**

```tsx
        loading && !comp && tracked.length === 0 ? (
          <DemoCard>{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}</DemoCard>
        ) : groups.length === 0 ? (
```

- [ ] **Step 4: Add a charts row** (above the `groups.map` ranking, inside the same container)

```tsx
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Share of voice" subtitle="Follower share" isEmpty={!sovData.length}>
            <DonutChart data={sovData} />
          </ChartCard>
          <ChartCard title="Engagement rate" subtitle="By competitor" isEmpty={!engBar.length}>
            <CategoryBarChart data={engBar} horizontal />
          </ChartCard>
          <ChartCard title="Follower growth" subtitle="Top tracked competitors"
            isEmpty={trendSeries.length === 0}>
            <TrendLineChart data={trendData} series={trendSeries} />
          </ChartCard>
        </div>
```

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Manual verify** — `/epcc-demo/competitors`: SOV donut + engagement bar render from tracked rows; trend line shows when ≥2 snapshots exist (empty state otherwise); existing per-row sparklines unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/modules/EpccDemo/screens/Competitors.tsx
git commit -m "feat: add benchmark charts + skeletons on Competitors"
```

---

## Task 9: PostDetail — skeletons + interaction chart

**Files:**
- Modify: `src/modules/EpccDemo/screens/PostDetail.tsx`

**Interfaces:**
- Consumes: `ChartCard`, `ChartSkeleton`, `ListRowSkeleton` from `../_components/ui`; `CategoryBarChart` from `../_components/charts`.

- [ ] **Step 1: Extend imports + drop unused Recharts**

Add to `../_components/ui` import: `ChartCard, ChartSkeleton, ListRowSkeleton`.
Add: `import { CategoryBarChart } from '../_components/charts';`
In the recharts import (lines 7-10), remove the unused `AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid` (keep `ResponsiveContainer, PieChart, Pie, Cell, Tooltip` used by `ReactionDonut`). Verify none are referenced elsewhere first: `grep -nE 'AreaChart|<Bar|<Area|XAxis|YAxis|CartesianGrid' src/modules/EpccDemo/screens/PostDetail.tsx`.

- [ ] **Step 2: Build interaction data from the existing `engagement` array (line 106)**

```ts
  const interactionData = (engagement ?? []).map((e: any) => ({ label: e.label ?? e.name, value: Number(e.value ?? 0) }));
```

- [ ] **Step 3: Add an interaction `ChartCard`** (next to the existing `ReactionDonut`, in the published section)

```tsx
            <ChartCard title="Interactions" subtitle="Likes · comments · shares · saves"
              isEmpty={!interactionData.length}>
              <CategoryBarChart data={interactionData} />
            </ChartCard>
```

- [ ] **Step 4: Skeleton the live block while `live.loading`** — wrap the live metrics region so that when `ref && live.loading && !live.data`, it renders:

```tsx
            {ref && live.loading && !live.data ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>
            ) : null}
```

And in the comments section, replace the empty/loading text with `ListRowSkeleton` while comments are loading.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS (and no "unused import" / undefined errors from the removed Recharts names).

- [ ] **Step 6: Manual verify** — open a published post detail; reaction donut + interactions bar render; live block shows chart skeletons while insights load.

- [ ] **Step 7: Commit**

```bash
git add src/modules/EpccDemo/screens/PostDetail.tsx
git commit -m "feat: interaction chart + skeletons on Post Detail"
```

---

## Task 10: Skeleton-only pass — Inbox, Posts, Accounts

**Files:**
- Modify: `src/modules/EpccDemo/screens/Inbox.tsx`, `PostsAnalytics.tsx`, `Accounts.tsx`

**Interfaces:**
- Consumes: `ListRowSkeleton` (and `StatCardSkeleton` where a KPI row exists) from `../_components/ui`.

- [ ] **Step 1: Locate each screen's cold-load/empty branch**

Run: `grep -nE "loading|Loading…|No .* yet" src/modules/EpccDemo/screens/Inbox.tsx src/modules/EpccDemo/screens/PostsAnalytics.tsx src/modules/EpccDemo/screens/Accounts.tsx`

- [ ] **Step 2: Replace each "Loading…" / spinner-only cold state with `ListRowSkeleton` lists** (5 rows), matching the list shape of that screen. Add `ListRowSkeleton` to each file's `../_components/ui` import.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verify** — Inbox/Posts/Accounts cold load shows skeleton rows instead of "Loading…".

- [ ] **Step 5: Commit**

```bash
git add src/modules/EpccDemo/screens/Inbox.tsx src/modules/EpccDemo/screens/PostsAnalytics.tsx src/modules/EpccDemo/screens/Accounts.tsx
git commit -m "feat: skeleton loaders on Inbox, Posts, Accounts"
```

---

## Task 11: Fold top charts into the PDF export

**Files:**
- Modify: `src/modules/EpccDemo/_components/AnalyticsPdf.tsx`
- Modify: `src/modules/EpccDemo/screens/AnalyticsHub.tsx` (pass new data into the PDF data object)

**Interfaces:**
- Consumes: the `chartData` derived in Task 5 (`reactionsData`, `engByPlatform`, `topPostsBar`) + existing growth/content-mix.

- [ ] **Step 1: Inspect the PDF data contract**

Run: `grep -nE "interface AnalyticsPdfData|reactions|contentMix|growth|topPosts|Bar|Donut|Chart" src/modules/EpccDemo/_components/AnalyticsPdf.tsx | head -40`
Identify the `AnalyticsPdfData` shape and the existing hand-drawn chart helpers (react-pdf has no Recharts — charts are drawn with `View`/`Svg` primitives).

- [ ] **Step 2: Extend `AnalyticsPdfData`** with the new series (mirror existing field style):

```ts
  reactions?: { label: string; value: number }[];
  engByPlatform?: { label: string; value: number }[];
  topPosts?: { label: string; value: number }[];
```

- [ ] **Step 3: Render the new charts** using the file's existing hand-drawn bar/donut helpers (reuse, don't add a chart lib). Add a "Reactions", "Engagement by platform", and "Top posts" block in the same vector style + Cairo font as the current charts. Feed them from the new `AnalyticsPdfData` fields.

- [ ] **Step 4: Wire the data in `AnalyticsHub.tsx`** — where the `AnalyticsPdfData` object is assembled for export, add `reactions: reactionsData, engByPlatform, topPosts: topPostsBar` (the same arrays computed in Task 5, so the PDF matches the screen exactly).

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Manual verify** — from `/epcc-demo/analytics`, export the PDF. The new charts appear with correct numbers (cross-check against the on-screen charts) and correct Arabic/branding.

- [ ] **Step 7: Commit**

```bash
git add src/modules/EpccDemo/_components/AnalyticsPdf.tsx src/modules/EpccDemo/screens/AnalyticsHub.tsx
git commit -m "feat: include top analytics charts in PDF export"
```

---

## Self-Review

**Spec coverage:**
- §3 Skeletons → Tasks 1, 4-10 ✓
- §4 Charts (ChartCard + catalog + per-screen) → Tasks 2, 4-9 ✓
- §5 Backend daily series → Task 3 ✓ (competitor history needs no change — confirmed)
- §6 PDF → Task 11 ✓
- §2 non-goals respected: `useApi` cache untouched; Refresh keeps spinner; no new connectors.

**Placeholder scan:** No TBD/TODO; every code step has concrete code; no "add error handling" hand-waving (empty states are explicit via `ChartCard isEmpty`).

**Type consistency:** Catalog signatures in Task 2 match all consumer call-sites in Tasks 4-9 (`ChartDatum {label,value}` for Donut/CategoryBar; `series:{key,name,color?}[]` for TrendLine; `{x,y,name}` for ScatterPlot; `mergeHistories` rows `{name,history:{takenAt,followers}[]}`). `GENDER_COLORS` exported once (Task 1), imported in Tasks 5 & 7, local copies removed.

**Deviation from spec (noted):** Spec §4.1 listed a `RadialChart` — dropped (no screen needs it, YAGNI). Competitors trend uses the `mergeHistories` multi-line approach (spec's "trend lines") plus existing per-row sparklines.

**Known soft spots for the implementer:**
- Exact line numbers will drift as edits land — anchor on the quoted code strings, not line numbers.
- `report.platforms[].stats` is `Record<string,...>`; the `engByPlatform` accessor uses `as any` with a fallback chain — verify the real field name against a live `/api/report` response and tighten if present.
- AnalyticsPdf chart helpers are hand-drawn; Task 11 reuses them rather than introducing any chart lib.
