# Richer Analytics + Skeleton Loading — Design Spec

**Date:** 2026-06-30
**Status:** Approved (design) — pending implementation plan
**Scope:** Phase 1 of two. (Phase 2 = per-network connector plans, tracked separately.)

---

## 1. Problem & goals

Two client-driven problems:

1. **Loading feels broken.** `useApi` only flags `loading` on the first uncached fetch
   (`src/modules/EpccDemo/_services/useApi.ts:13`). On a cold load each screen shows ad-hoc
   `"Loading…"` text or a hidden body with a spinner, so the user stares at a near-empty page
   while data is fetched from Meta. (On revisit, cached data renders instantly — that already
   works and must be preserved.)
2. **Not enough charts.** The client wants richer data visualization across **all** analytics
   screens. A lot of data the screens already fetch (daily growth, reactions, content mix,
   demographics, competitor history) is not visualized.

**Goals**
- Replace cold-load/empty loading states with **layout-matched skeleton loaders** everywhere.
- Add **richer charts to all six analytics screens**, using already-fetched data first and
  extending the backend only where a valuable chart needs new data.
- Fold the **top new charts into the branded PDF export** (`AnalyticsPdf.tsx`).
- Keep everything consistent with the existing design system (`ui.tsx`, `form.tsx`) and the
  SWR-style `useApi` cache.

**Non-goals**
- No change to the `useApi` cache/revalidation behavior beyond skeletons (instant cached
  render on revisit stays as-is).
- The manual **Refresh** button keeps its existing `RefreshCw` spin animation — skeletons are
  for cold/empty loads only, not manual refreshes.
- No new social connectors (that is Phase 2).
- No redesign of existing working charts; we add alongside them.

---

## 2. Architecture

Two small **reusable systems** added to the design-system layer, then applied screen-by-screen.
This mirrors how `DemoCard` / `StatCard` / `DsField` already work — composition over per-screen
bespoke code.

```
src/modules/EpccDemo/_components/
├── ui.tsx          # + skeleton primitives, + ChartCard wrapper
└── charts.tsx      # (new) shared chart building blocks built on Recharts
```

- **Skeleton system** — base primitives + a handful of composite skeletons; each screen renders
  a skeleton shaped like its real layout.
- **Chart system** — one `ChartCard` wrapper + a small catalog of chart components; all new
  charts go through it for consistent headers, colors, responsive sizing, and empty states.

**Rejected alternatives:** a single generic full-page skeleton (looks mismatched/cheap); a magic
`<Loadable>` wrapper (hides too much, hard to tailor per screen).

---

## 3. Section A — Skeleton loading

### 3.1 Primitives (add to `ui.tsx`)
- `Skeleton` — base block: `animate-pulse`, `rounded`, neutral token bg (e.g.
  `bg-neutral-200/70`), accepts `className` for sizing. The single building block.
- `SkeletonText` — `{lines?, width?}` stacked text bars.
- `StatCardSkeleton` — matches `StatCard` footprint (label bar + big value bar + delta bar).
- `ChartSkeleton` — `{height?}` a `ChartCard`-shaped block: header bars + a chart-area block.
- `ListRowSkeleton` / `TableRowSkeleton` — for feeds/tables (posts, comments, competitors).

All use neutral Tailwind tokens only (no raw hex), per project conventions.

### 3.2 Per-screen application
In each screen's `loading && !data` branch, render a **layout-shaped skeleton** (correct number
of stat cards + chart blocks in the correct grid) instead of text. Screens to update:

| Screen | Skeleton shape |
|--------|----------------|
| CommandCenter | KPI row (4 `StatCardSkeleton`) + 2 `ChartSkeleton` + `ListRowSkeleton`×N feed |
| AnalyticsHub | KPI row + grid of `ChartSkeleton` |
| GrowthInsights | KPI row + `ChartSkeleton` (growth) + `ChartSkeleton` (heatmap) |
| AudienceInsights | 2–3 `ChartSkeleton` (donut/histogram/bar) |
| Competitors | `TableRowSkeleton`×N + `ChartSkeleton` (trend) |
| PostDetail | KPI row + `ChartSkeleton`×2 + `ListRowSkeleton` comments |
| Inbox / Posts / Accounts | `ListRowSkeleton`×N (lighter touch — consistency) |

Replace the inline `"Loading…"` strings (e.g. `CommandCenter.tsx:177,243`) with skeletons or,
for small inline lists, a `ListRowSkeleton`.

### 3.3 Behavior
- Skeleton shows only when `loading && !data` (first/cold load, nothing cached).
- On revisit, cached data renders immediately — no skeleton flash (unchanged `useApi`).
- The Refresh button stays `disabled` + `RefreshCw animate-spin` during a forced refresh; the
  already-rendered content stays visible (no skeleton on manual refresh).

---

## 4. Section B — Charts

### 4.1 `ChartCard` wrapper + `charts.tsx`
- `ChartCard` (in `ui.tsx`): `DemoCard` container + header (`title`, optional `subtitle`,
  optional right-slot like a legend/toggle) + a Recharts `ResponsiveContainer` body + a built-in
  **empty state** ("No data yet" when the series is empty — important given Meta deprecations).
- `charts.tsx` (new): thin, reusable wrappers so screens declare data, not Recharts boilerplate:
  `DonutChart`, `TrendAreaChart`, `TrendLineChart`, `CategoryBarChart`, `ScatterChart`,
  `RadialChart`. All consume `CHART_COLORS` from `ui.tsx:107`. Recharts already provides Area /
  Bar / Pie; we add Line / Scatter / RadialBar.

### 4.2 Per-screen chart inventory (data source noted)

**CommandCenter** (`/api/overview`, `/api/metrics`)
- Follower-growth **area** (net daily, from `growth[]`) — *existing data*
- Followers-by-platform **donut** — *existing data*
- Engagement **trend line** (daily engagements) — *needs backend: daily series (§5)*
- Content-mix **bar** (from `contentMix[]`) — *existing data*

**AnalyticsHub** (`/api/overview?period`, `/api/metrics`, `/api/report?period`) — *PDF-feeding*
- Reactions **donut** (from `reactions{}`) — *existing*
- Content-mix **bar** — *existing*
- Engagement-rate-by-platform **bar** — *existing (metrics)*
- Reach/Views **trend** (line/area over time) — *needs backend: daily series (§5)*
- Top-posts **bar** (engagement, from `topPosts[]`) — *existing*

**GrowthInsights** (`/api/overview`, `/api/metrics`)
- Net-new-followers **bar** per day (adds − removes, from `growth[]`) — *existing*
- Content-performance **scatter** (engagement vs reach per post, `topPosts[]` + insights;
  graceful fallback where reach is unavailable) — *existing where present*
- Engagement-rate **trend line** — *needs backend: daily series (§5)*
- (Keep existing best-time `Heatmap`.)

**AudienceInsights** (`/api/audience`)
- Gender **donut** — *existing (IG demographics)*
- Age **histogram (bar)** — *existing*
- Top-countries **bar** — *existing*

**Competitors** (`/api/competitors`, `/api/competitors/track`)
- Follower-growth **trend lines** from `history[]` (multi-series) —
  *existing: `track` route already returns `history` + `growth`*
- Engagement comparison **bar** (avg eng / eng-rate) — *existing*
- Share-of-voice **donut** (follower share) — *existing*

**PostDetail** (`/api/posts/insights`, `/api/posts/comments`)
- Reactions **donut** — *existing*
- Interaction breakdown **bar** (likes/comments/shares/saves) — *existing*

Every chart degrades to the `ChartCard` empty state when its series is empty (Meta reach /
impressions / FB demographics deprecations are handled, not crashed).

---

## 5. Section C — Backend extensions (minimal, scoped)

Only where a charted series is not currently exposed:

1. **Expose daily series in `/api/overview`.** The route already pulls daily FB metrics into an
   internal `series` map (`app/api/overview/route.ts:77-99`) but only returns the 28-day
   **totals** (and the net `growth[]`). Add a `series` field to each account view exposing the
   per-day arrays needed by the trend charts: `engagements`, `pageViews`, `videoViews` (and the
   IG `reach`/`views` daily series from the IG block at `:142`, if returned per-day; otherwise
   expose what total_value gives and the chart falls back to its empty/aggregate state).
   - This is additive (new field), cached via existing `getCached`, no extra Meta calls beyond
     what the route already makes.
2. **No change needed for competitor trends** — `/api/competitors/track` already returns
   `history[]` + `growth` (`app/api/competitors/track/route.ts:21,56`).
3. **No change needed for net-new-followers, reactions, content-mix, demographics, top posts** —
   all already in the existing responses.

Honesty constraint: Meta has deprecated some series (FB Page reach, FB demographics). Where a
series comes back empty, the chart shows the `ChartCard` empty state rather than fabricating data.

---

## 6. Section D — PDF export

`AnalyticsPdf.tsx` renders a branded vector PDF with hand-drawn charts (`@react-pdf/renderer`).
Fold the **top charts** from AnalyticsHub into it:
- Follower-growth trend, Reactions donut, Content-mix bar, Engagement-rate-by-platform bar,
  Top-posts bar.
- Reuse the file's existing hand-drawn chart helpers (react-pdf has no Recharts); add the new
  charts in the same vector style, fed by the same data the on-screen charts use.
- Keep the existing Cairo Arabic font + branding.

---

## 7. File-by-file change list

**New**
- `src/modules/EpccDemo/_components/charts.tsx` — chart catalog (Donut/TrendArea/TrendLine/
  CategoryBar/Scatter/Radial) on Recharts.

**Edited**
- `src/modules/EpccDemo/_components/ui.tsx` — add skeleton primitives + `ChartCard`.
- `app/api/overview/route.ts` — expose daily `series` field (additive).
- Screens: `CommandCenter.tsx`, `AnalyticsHub.tsx`, `GrowthInsights.tsx`, `AudienceInsights.tsx`,
  `Competitors.tsx`, `PostDetail.tsx` — add charts + skeletons.
- Lighter skeleton-only touch: `Inbox.tsx`, `PostsAnalytics.tsx`, `Accounts.tsx`.
- `src/modules/EpccDemo/_components/AnalyticsPdf.tsx` — add top charts to the PDF.

---

## 8. Testing & verification

- `npm run typecheck` and `npm run build` must pass.
- Manual: with `DATABASE_URL` + a connected Meta account, load each screen **cold** (clear the
  in-memory cache via hard reload) → skeletons appear, then charts fill in. Revisit → instant,
  no skeleton flash. Manual Refresh → spinner only, content stays.
- Empty-data path: a screen/series with no data shows the `ChartCard` empty state (no crash).
- PDF: export from AnalyticsHub → new charts render with correct data and branding.

---

## 9. Risks & mitigations

- **Meta metric deprecations** (FB reach, FB demographics, per-post reach) → some series empty.
  *Mitigation:* `ChartCard` empty state; never fabricate.
- **Chart density / clutter** → too many charts hurt readability. *Mitigation:* group in a
  consistent grid; keep 4–5 high-value charts per screen, not everything possible.
- **PDF chart drift** (react-pdf charts are hand-drawn, separate from Recharts) → risk of the PDF
  showing different numbers than the screen. *Mitigation:* feed both from the same computed data
  object; verify side-by-side.
- **Bundle size** (more Recharts chart types) → minor; Recharts already bundled.

---

## 10. Out of scope (Phase 2, tracked separately)

Per-network connector plans for **Snapchat, LinkedIn, TikTok, X** — each its own spec → plan →
implementation cycle, using the existing `SocialConnector` registry pattern.
