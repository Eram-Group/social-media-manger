'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Swords, RefreshCw, Plus, Trash2, Lock, ExternalLink, Crown, Pencil, X,
  TrendingUp, TrendingDown, Hash, Activity, Search,
} from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, formatFollowers } from '../_components/ui';
import { useApi } from '../_services/useApi';

// ── Live data shapes (existing routes) ──────────────────────────────────────
interface PostsAnalysis { postsPerWeek: number; avgEng: number; engagementRate: number | null }
interface ApiPage { ref?: string; name?: string; category?: string; followers?: number; link?: string; error?: string; analysis?: PostsAnalysis }
interface CompetitorsResp { ok: boolean; available: boolean; self: ApiPage[]; competitors: ApiPage[] }
interface MetricsResp { facebook?: { engagement_rate_percentage?: number; followers_count?: number }[] }
interface OverviewResp { facebook?: { followers?: number | null; totals?: { netFollows28d?: number } }[] }
interface DiscoverResp { available: boolean; hashtags: { tag: string; topEng: number; top: unknown[] }[] }

// ── Tracked competitors (new route) ─────────────────────────────────────────
interface TrackedView {
  id: string; name: string; category: string; pageUrl?: string | null;
  followers: number | null; avgEng: number | null; postsPerWeek: number | null;
  engagementRate: number | null; snapshotCount: number; lastUpdated: number | null;
  history: { takenAt: number; followers: number }[];
  growth: { pct: number; per30: number; days: number; prevFollowers: number } | null;
}
interface TrackResp { ok: boolean; competitors: TrackedView[] }

interface Row {
  key: string; name: string; category: string; followers: number; link?: string | null; pageUrl?: string | null;
  engagementRate: number | null; growthPer30: number | null; history?: { takenAt: number; followers: number }[];
  source: 'you' | 'tracked' | 'api'; id?: string;
}

const OLD_LS_KEY = 'epcc_manual_competitors';
const pctText = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const searchUrl = (name: string) => `https://www.facebook.com/search/pages/?q=${encodeURIComponent(name)}`;

// Tiny inline sparkline from a follower history (no chart lib overhead per row).
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 64, h = 20, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ');
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={d} fill="none" stroke={up ? '#00A87E' : '#E5484D'} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function Competitors() {
  const { data: track, refresh: refreshTrack } = useApi<TrackResp>('/api/competitors/track');
  const { data: comp, loading, refresh: refreshComp } = useApi<CompetitorsResp>('/api/competitors');
  const { data: metrics } = useApi<MetricsResp>('/api/metrics');
  const { data: overview } = useApi<OverviewResp>('/api/overview');
  const { data: discover } = useApi<DiscoverResp>('/api/discover');

  const { data: watch, refresh: refreshWatch } = useApi<{ watched: { ref: string; label?: string | null }[] }>('/api/competitors/watch');
  const [rankBy, setRankBy] = useState<'followers' | 'engagement'>('followers');
  const [form, setForm] = useState({ id: '', name: '', category: '', pageUrl: '', followers: '', avgEng: '', postsPerWeek: '' });
  const [busy, setBusy] = useState(false);
  const migrated = useRef(false);

  // Pages Search (PPCA): find real pages by keyword, then add to the benchmark.
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchRes, setSearchRes] = useState<{ id: string; name?: string; category?: string; followers?: number; link?: string; verified?: boolean }[] | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const watched = watch?.watched ?? [];

  const runSearch = async () => {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true); setSearchErr(null);
    try {
      const r = await fetch(`/api/competitors/search?q=${encodeURIComponent(q)}`).then((x) => x.json());
      setSearchRes(r.results ?? []);
      setSearchErr(r.error ?? null);
    } catch (e) { setSearchErr((e as Error).message); }
    setSearching(false);
  };
  const addWatch = async (ref: string, label?: string) => {
    await fetch('/api/competitors/watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, label }) }).catch(() => {});
    refreshWatch(); refreshComp();
  };
  const removeWatch = async (ref: string) => {
    await fetch(`/api/competitors/watch?ref=${encodeURIComponent(ref)}`, { method: 'DELETE' }).catch(() => {});
    refreshWatch(); refreshComp();
  };

  const tracked = track?.competitors ?? [];
  const selfPage = comp?.self?.find((s) => s.category) ?? comp?.self?.[0];
  const selfCategory = selfPage?.category ?? '';
  const blocked = (comp?.competitors ?? []).filter((c) => c.error);

  // Live "YOU" figures.
  const youFollowers = selfPage?.followers ?? metrics?.facebook?.[0]?.followers_count ?? 0;
  const youEngRate = metrics?.facebook?.[0]?.engagement_rate_percentage ?? null;
  const youNet28 = overview?.facebook?.[0]?.totals?.netFollows28d ?? null;
  const youGrowthPer30 = youNet28 != null && youFollowers ? (youNet28 / youFollowers) * 100 * (30 / 28) : null;

  // Default new-competitor category to the Chamber's own, for apples-to-apples.
  useEffect(() => { if (selfCategory && !form.category && !form.id) setForm((f) => ({ ...f, category: selfCategory })); }, [selfCategory]); // eslint-disable-line

  // One-time migration of the old localStorage manual list into the tracked store.
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    let old: { name: string; category: string; followers: number }[] = [];
    try { old = JSON.parse(localStorage.getItem(OLD_LS_KEY) || '[]'); } catch { /* ignore */ }
    if (!old.length) return;
    (async () => {
      for (const o of old) {
        await fetch('/api/competitors/track', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: o.name, category: o.category, followers: o.followers }),
        }).catch(() => {});
      }
      localStorage.removeItem(OLD_LS_KEY);
      refreshTrack();
    })();
  }, [refreshTrack]);

  const resetForm = () => setForm({ id: '', name: '', category: selfCategory, pageUrl: '', followers: '', avgEng: '', postsPerWeek: '' });

  const save = async () => {
    const followers = parseInt(form.followers, 10);
    if (!form.name.trim() || isNaN(followers)) return;
    setBusy(true);
    await fetch('/api/competitors/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id || undefined,
        name: form.name.trim(),
        category: form.category.trim() || 'Uncategorized',
        pageUrl: form.pageUrl.trim() || undefined,
        followers,
        avgEng: form.avgEng ? Number(form.avgEng) : undefined,
        postsPerWeek: form.postsPerWeek ? Number(form.postsPerWeek) : undefined,
      }),
    }).catch(() => {});
    setBusy(false);
    resetForm();
    refreshTrack();
  };

  const edit = (c: TrackedView) => setForm({
    id: c.id, name: c.name, category: c.category, pageUrl: c.pageUrl ?? '',
    followers: c.followers != null ? String(c.followers) : '',
    avgEng: c.avgEng != null ? String(c.avgEng) : '',
    postsPerWeek: c.postsPerWeek != null ? String(c.postsPerWeek) : '',
  });

  const remove = async (id: string) => {
    await fetch(`/api/competitors/track?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    refreshTrack();
  };

  const refreshAll = () => { refreshTrack(); refreshComp(); };

  // Merge YOU + tracked into category groups, ranked by the chosen metric.
  const groups = useMemo(() => {
    const rows: Row[] = [];
    if (youFollowers) {
      rows.push({
        key: 'you', name: selfPage?.name || 'EP Chamber', category: selfCategory || 'Uncategorized',
        followers: youFollowers, link: selfPage?.link, engagementRate: youEngRate, growthPer30: youGrowthPer30, source: 'you',
      });
    }
    // Readable API competitors (live the moment PPCA is approved) — no manual entry.
    for (const c of comp?.competitors ?? []) {
      if (c.error || !c.followers) continue;
      rows.push({
        key: `api-${c.ref}`, name: c.name || c.ref || '?', category: c.category || 'Uncategorized',
        followers: c.followers, link: c.link, engagementRate: c.analysis?.engagementRate ?? null,
        growthPer30: null, source: 'api',
      });
    }
    for (const c of tracked) {
      rows.push({
        key: c.id, name: c.name, category: c.category || 'Uncategorized', followers: c.followers ?? 0, pageUrl: c.pageUrl,
        engagementRate: c.engagementRate, growthPer30: c.growth?.per30 ?? null, history: c.history, source: 'tracked', id: c.id,
      });
    }
    const map = new Map<string, Row[]>();
    for (const r of rows) { const l = map.get(r.category) ?? []; l.push(r); map.set(r.category, l); }
    const sortFn = rankBy === 'engagement'
      ? (a: Row, b: Row) => (b.engagementRate ?? -1) - (a.engagementRate ?? -1)
      : (a: Row, b: Row) => b.followers - a.followers;
    return [...map.entries()]
      .map(([category, list]) => ({ category, rows: [...list].sort(sortFn) }))
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [tracked, comp, youFollowers, youEngRate, youGrowthPer30, selfPage, selfCategory, rankBy]);

  // Share of voice from hashtag Discovery.
  const sov = useMemo(() => {
    if (!discover?.available) return null;
    const tags = discover.hashtags.filter((h) => h.top.length > 0);
    return { totalEng: tags.reduce((s, h) => s + h.topEng, 0), tagCount: tags.length, top: tags[0]?.tag };
  }, [discover]);

  const editing = Boolean(form.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Competitive Benchmark" subtitle="Track peers over time, compare on engagement (not just size), and see what's moving in your space." />
        <button onClick={refreshAll} disabled={loading} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── YOU, live from Meta ── */}
      <DemoCard>
        <div className="flex items-center justify-between gap-2">
          <SectionTitle title={`You · ${selfPage?.name || 'EP Chamber'}`} subtitle="Live from the Meta API — always current" />
          <span className="flex items-center gap-1.5 rounded-full bg-warnings-successBg px-2.5 py-1 text-xs font-medium text-warnings-success"><Activity size={12} /> Live</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Followers" value={youFollowers ? formatFollowers(youFollowers) : '—'} />
          <StatCard label="Engagement rate" value={youEngRate != null ? `${youEngRate}%` : '—'} />
          <StatCard label="Growth · /mo" value={youGrowthPer30 != null ? pctText(youGrowthPer30) : '—'} delta={youGrowthPer30 != null ? Math.round(youGrowthPer30 * 10) / 10 : undefined} />
          <StatCard label="Category" value={selfCategory || '—'} />
        </div>
      </DemoCard>

      {/* ── Share of voice (real public signal) ── */}
      {sov && sov.tagCount > 0 && (
        <DemoCard className="flex flex-wrap items-center justify-between gap-3 bg-primary-100 py-4">
          <div className="flex items-start gap-3 text-sm text-primary-900">
            <Hash size={18} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">{formatFollowers(sov.totalEng)} public engagement</span> is happening around your {sov.tagCount} tracked
              hashtag{sov.tagCount > 1 ? 's' : ''} right now{sov.top ? <> — led by <span className="font-semibold">#{sov.top}</span></> : null}. This is the real
              conversation in your space (competitor pages need Meta App Review to read directly).
            </p>
          </div>
          <a href="/epcc-demo/discover" className="shrink-0 rounded-lg bg-primary-800 px-3 py-2 text-sm font-medium text-white hover:bg-primary-900">Open Discovery →</a>
        </DemoCard>
      )}

      {/* ── Find pages on Facebook (Pages Search · PPCA) ── */}
      <DemoCard>
        <SectionTitle
          title="Find competitor pages on Facebook"
          subtitle="Search by keyword (e.g. “chamber of commerce”), then add the real pages you want to benchmark. Live data needs Page Public Content Access (App Review)." />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5">
            <Search size={16} className="text-neutral-400" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
              placeholder="Search pages by keyword or category term…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          </div>
          <button onClick={runSearch} disabled={searching || !searchQ.trim()} className="flex items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900 disabled:opacity-50">
            <Search size={15} className={searching ? 'animate-pulse' : ''} /> Search
          </button>
        </div>

        {/* Watched pages (picked from search) */}
        {watched.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">Watching:</span>
            {watched.map((w) => (
              <span key={w.ref} className="flex items-center gap-1.5 rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium text-primary-900">
                {w.label || w.ref}
                <button onClick={() => removeWatch(w.ref)} className="text-primary-900/60 hover:text-primary-900"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}

        {searchErr && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-warnings-cautionBg px-3 py-2.5 text-sm text-warnings-caution">
            <Lock size={16} className="mt-0.5 shrink-0" /> {searchErr}
          </p>
        )}

        {searchRes && searchRes.length > 0 && (
          <div className="mt-4 flex flex-col divide-y divide-neutral-200">
            {searchRes.map((p) => {
              const already = watched.some((w) => w.ref === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-neutral-800">
                      {p.name || p.id}
                      {p.verified && <span className="text-primary-700">✓</span>}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{[p.category, p.followers != null ? `${formatFollowers(p.followers)} followers` : null].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-primary-800"><ExternalLink size={14} /></a>}
                    <button onClick={() => addWatch(p.id, p.name)} disabled={already}
                      className="flex items-center gap-1 rounded-lg border border-primary-300 px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-100 disabled:opacity-40">
                      <Plus size={13} /> {already ? 'Added' : 'Add'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {searchRes && searchRes.length === 0 && !searchErr && (
          <p className="mt-3 text-sm text-neutral-500">No pages found for “{searchQ}”.</p>
        )}
      </DemoCard>

      {/* ── Add / update a competitor ── */}
      <DemoCard>
        <div className="flex items-center justify-between gap-2">
          <SectionTitle
            title={editing ? `Update “${form.name}”` : 'Add a competitor'}
            subtitle="Enter the numbers from the page (open it below). Each save is timestamped, so you build a growth trend over time." />
          {editing && <button onClick={resetForm} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800"><X size={14} /> Cancel</button>}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Page name (e.g. Riyadh Chamber)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          <input value={form.pageUrl} onChange={(e) => setForm({ ...form, pageUrl: e.target.value })} placeholder="Page URL (optional)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          <input value={form.followers} onChange={(e) => setForm({ ...form, followers: e.target.value.replace(/[^0-9]/g, '') })} placeholder="Followers" inputMode="numeric" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          <input value={form.avgEng} onChange={(e) => setForm({ ...form, avgEng: e.target.value.replace(/[^0-9]/g, '') })} placeholder="Avg likes+comments / post (optional)" inputMode="numeric" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          <input value={form.postsPerWeek} onChange={(e) => setForm({ ...form, postsPerWeek: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="Posts / week (optional)" inputMode="numeric" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} disabled={busy || !form.name.trim() || !form.followers} className="flex items-center justify-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900 disabled:opacity-50">
            {editing ? <><Pencil size={15} /> Save update</> : <><Plus size={16} /> Add competitor</>}
          </button>
          {form.name.trim() && (
            <a href={form.pageUrl.trim() || searchUrl(form.name)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary-800 hover:underline">
              <Search size={14} /> Find “{form.name.trim()}” on Facebook <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Tip: enter <span className="font-medium">avg likes+comments per post</span> to rank by engagement rate — a small page that engages well beats a big quiet one.</p>
      </DemoCard>

      {/* ── Rank-by toggle ── */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-500">Rank by</span>
          <div className="flex rounded-lg border border-neutral-200 p-0.5">
            <button onClick={() => setRankBy('followers')} className={rankBy === 'followers' ? 'rounded-md bg-primary-800 px-3 py-1.5 font-medium text-white' : 'px-3 py-1.5 text-neutral-600'}>Followers</button>
            <button onClick={() => setRankBy('engagement')} className={rankBy === 'engagement' ? 'rounded-md bg-primary-800 px-3 py-1.5 font-medium text-white' : 'px-3 py-1.5 text-neutral-600'}>Engagement rate</button>
          </div>
        </div>
      )}

      {/* ── Comparison groups ── */}
      {loading && !comp && tracked.length === 0 ? (
        <DemoCard className="py-12 text-center text-sm text-neutral-500">Loading…</DemoCard>
      ) : groups.length === 0 ? (
        <DemoCard className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Swords size={22} /></span>
          <div>
            <p className="font-Sora text-base font-semibold">No competitors tracked yet</p>
            <p className="mt-1 max-w-md text-sm text-neutral-500">Add a peer page above. Re-enter its numbers monthly and this turns into a growth race — who's gaining, who's stalling.</p>
          </div>
        </DemoCard>
      ) : (
        groups.map((g) => {
          const max = Math.max(...g.rows.map((r) => r.followers), 1);
          return (
            <DemoCard key={g.category}>
              <SectionTitle title={g.category} subtitle={`${g.rows.length} page(s) · ranked by ${rankBy === 'engagement' ? 'engagement rate' : 'followers'}`} />
              <div className="mt-4 flex flex-col gap-3">
                {g.rows.map((r, i) => {
                  const growth = r.growthPer30;
                  return (
                    <div key={r.key} className={`rounded-lg border p-3 ${r.source === 'you' ? 'border-primary-300 bg-primary-100/40' : 'border-neutral-200'}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-accent-800 text-text-dark' : 'bg-neutral-200 text-neutral-600'}`}>{i + 1}</span>
                          {i === 0 && <Crown size={15} className="shrink-0 text-accent-800" />}
                          <span className="truncate text-sm font-medium text-neutral-800">{r.name}</span>
                          {r.source === 'you' && <span className="shrink-0 rounded-full bg-primary-800 px-2 py-0.5 text-[10px] font-medium text-white">YOU</span>}
                          {r.source === 'api' && <span className="shrink-0 rounded-full bg-warnings-successBg px-2 py-0.5 text-[10px] font-medium text-warnings-success">LIVE</span>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          {r.history && r.history.length > 1 && <Sparkline points={r.history.map((h) => h.followers)} />}
                          {growth != null && (
                            <span className={`flex items-center gap-0.5 text-xs font-medium ${growth >= 0 ? 'text-warnings-success' : 'text-text-red'}`}>
                              {growth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {pctText(growth)}/mo
                            </span>
                          )}
                          {r.engagementRate != null && (
                            <span className="rounded-full bg-secondary-200 px-2 py-0.5 text-xs font-medium text-primary-900">{r.engagementRate.toFixed(1)}% eng</span>
                          )}
                          <span className="w-14 text-right text-sm font-semibold text-neutral-800">{formatFollowers(r.followers)}</span>
                          {(r.pageUrl || r.link || r.source === 'tracked') && (
                            <a href={r.pageUrl || r.link || searchUrl(r.name)} target="_blank" rel="noreferrer" title="Open page" className="text-neutral-400 hover:text-primary-800"><ExternalLink size={14} /></a>
                          )}
                          {r.source === 'tracked' && r.id && (
                            <>
                              <button onClick={() => edit(tracked.find((t) => t.id === r.id)!)} title="Update numbers" className="text-neutral-400 hover:text-primary-800"><Pencil size={14} /></button>
                              <button onClick={() => remove(r.id!)} title="Remove" className="text-neutral-400 hover:text-text-red"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-200">
                        <div className={`h-2 rounded-full ${r.source === 'you' ? 'bg-primary-800' : 'bg-neutral-400'}`} style={{ width: `${Math.round((r.followers / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </DemoCard>
          );
        })
      )}

      {/* ── App Review path for true automation ── */}
      <DemoCard className="flex items-start gap-3 py-4 text-sm">
        <Lock size={18} className="mt-0.5 shrink-0 text-neutral-400" />
        <div className="text-neutral-600">
          <span className="font-medium text-neutral-800">Want real, auto-updating competitor data?</span> The only legitimate way to read pages you don't manage —
          their follower counts <span className="font-medium">and public posts</span> — is Meta's
          {' '}<span className="font-medium">“Page Public Content Access”</span> feature (App Review + Business Verification). Scraping is against Meta's terms and risks banning your real pages, so it's not an option.
          {blocked.length > 0 && <> Right now {blocked.length} peer page(s) are waiting on approval: {blocked.map((b) => b.ref || b.name).filter(Boolean).join(', ')} — they'll turn <span className="font-medium text-warnings-success">LIVE</span> automatically once granted.</>}
          {' '}<a href="https://developers.facebook.com/docs/features-reference/page-public-content-access/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary-800 hover:underline">How to apply <ExternalLink size={13} /></a>.
          {' '}Until then, hand-entered figures are tracked over time so they're still a real benchmark.
        </div>
      </DemoCard>
    </div>
  );
}
