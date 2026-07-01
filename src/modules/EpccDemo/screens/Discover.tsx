'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Hash, RefreshCw, ExternalLink, AlertCircle, X, Heart, MessageCircle,
  Sparkles, Film, Images, Search, ArrowRight,
} from 'lucide-react';
import { DemoCard, StatCard, formatFollowers } from '../_components/ui';
import { useApi } from '../_services/useApi';

interface HashtagMedia {
  id: string;
  caption?: string;
  mediaType?: string;
  likeCount: number;
  commentsCount: number;
  permalink?: string;
  timestamp?: string;
  mediaUrl?: string;
  eng: number;
}
interface HashtagResult {
  tag: string;
  id?: string;
  top: HashtagMedia[];
  recent: HashtagMedia[];
  topEng: number;
  error?: string;
}
interface Discover {
  available: boolean;
  reason?: string;
  account?: { id: string; name: string | null };
  hashtags: HashtagResult[];
}

const STORAGE_KEY = 'epcc:discover:tags';

// Featured hashtags for the discovery landing — the curated set relevant to the
// Eastern Province Chamber. These mirror the server's default HASHTAGS list so a
// click resolves to real posts once an Instagram account is connected.
const FEATURED: { tag: string; label: string }[] = [
  { tag: 'EasternProvince', label: 'Regional news, landmarks & community' },
  { tag: 'Dammam', label: 'City life, events & business' },
  { tag: 'Vision2030', label: 'National transformation & megaprojects' },
  { tag: 'SaudiBusiness', label: 'Economy, trade & enterprise' },
  { tag: 'Khobar', label: 'Waterfront, retail & lifestyle' },
  { tag: 'ريادة_الأعمال', label: 'Entrepreneurship & startups (Arabic)' },
];

// Persist the user's searched hashtags locally (mirrors the Competitors screen's
// manual-entry pattern). The server already tracks a curated default list too.
function useTrackedTags() {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTags(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const save = (next: string[]) => {
    setTags(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  return { tags, save };
}

function MediaCard({ m }: { m: HashtagMedia }) {
  const [broken, setBroken] = useState(false);
  const isVideo = m.mediaType === 'VIDEO';
  const isAlbum = m.mediaType === 'CAROUSEL_ALBUM';
  const showImg = m.mediaUrl && !isVideo && !broken;
  return (
    <a
      href={m.permalink} target="_blank" rel="noreferrer"
      className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
      {showImg ? (
        <img src={m.mediaUrl} alt="" loading="lazy" onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-100 to-secondary-200 text-primary-800">
          {isVideo ? <Film size={26} /> : isAlbum ? <Images size={26} /> : <Hash size={26} />}
        </div>
      )}
      {/* gradient + engagement footer */}
      <div className="relative z-10 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6 text-xs font-medium text-white">
        <span className="flex items-center gap-1"><Heart size={12} /> {formatFollowers(m.likeCount)}</span>
        <span className="flex items-center gap-1"><MessageCircle size={12} /> {formatFollowers(m.commentsCount)}</span>
        <ExternalLink size={12} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </a>
  );
}

function HashtagBlock({ h }: { h: HashtagResult }) {
  const [tab, setTab] = useState<'top' | 'recent'>('top');
  const media = tab === 'top' ? h.top : h.recent;

  return (
    <DemoCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-200 text-primary-900"><Hash size={18} /></span>
          <div>
            <h3 className="font-Sora text-base font-semibold text-text-dark">#{h.tag}</h3>
            <p className="text-xs text-neutral-500">
              {h.error ? 'Unavailable' : `${formatFollowers(h.topEng)} engagement across top posts`}
            </p>
          </div>
        </div>
        {!h.error && (h.top.length > 0 || h.recent.length > 0) && (
          <div className="flex rounded-lg border border-neutral-200 p-0.5 text-xs">
            <button onClick={() => setTab('top')}
              className={tab === 'top' ? 'rounded-md bg-primary-800 px-3 py-1.5 font-medium text-white' : 'px-3 py-1.5 text-neutral-600'}>
              Top
            </button>
            <button onClick={() => setTab('recent')}
              className={tab === 'recent' ? 'rounded-md bg-primary-800 px-3 py-1.5 font-medium text-white' : 'px-3 py-1.5 text-neutral-600'}>
              Recent
            </button>
          </div>
        )}
      </div>

      {h.error ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-warnings-cautionBg px-3 py-2.5 text-sm text-warnings-caution">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {h.error}
        </p>
      ) : media.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No public posts returned for this hashtag yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {media.map((m) => <MediaCard key={m.id} m={m} />)}
        </div>
      )}
    </DemoCard>
  );
}

// A featured hashtag tile on the landing — a clickable entry point into search.
function FeaturedCard({ tag, label, onSearch }: { tag: string; label: string; onSearch: () => void }) {
  return (
    <button
      onClick={onSearch}
      className="group flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-1 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-secondary-200 text-primary-800">
        <Hash size={22} />
      </span>
      <div>
        <h3 className="font-Sora text-base font-semibold text-text-dark">#{tag}</h3>
        <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
      </div>
      <span className="mt-auto flex items-center gap-1 text-sm font-medium text-primary-800">
        Search hashtag
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export default function Discover() {
  const { tags, save } = useTrackedTags();
  const [input, setInput] = useState('');

  // Searched tags ride along as ?tags=… ; the server merges them with its curated list.
  const url = useMemo(() => {
    const q = tags.map((t) => encodeURIComponent(t)).join(',');
    return q ? `/api/discover?tags=${q}` : '/api/discover';
  }, [tags]);

  const { data: raw, loading, refresh } = useApi<Discover>(url);
  const data = raw ?? { available: false, hashtags: [] };

  const searchTag = (value: string) => {
    const clean = value.replace(/^#/, '').trim();
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) save([...tags, clean]);
    setInput('');
  };
  const submit = () => searchTag(input);
  const removeTag = (t: string) => save(tags.filter((x) => x !== t));

  const totalEng = data.hashtags.reduce((s, h) => s + h.topEng, 0);
  const readable = data.hashtags.filter((h) => !h.error);
  const leader = readable[0];
  const hasResults = data.available && data.hashtags.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Hero search ─────────────────────────────────────────────────── */}
      <DemoCard className="relative overflow-hidden bg-gradient-to-br from-primary-800 to-primary-900 py-9 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-secondary-200/20 blur-2xl" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Sparkles size={13} /> Content Discovery
          </span>
          <h1 className="font-Sora text-2xl font-bold tracking-tight sm:text-[28px]">Search Instagram by hashtag</h1>
          <p className="max-w-lg text-sm text-white/80">
            Explore the top &amp; most-recent public posts for any hashtag — real Instagram data, no competitor access needed.
          </p>

          <div className="mt-1 flex w-full flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white px-4 py-3 text-neutral-800 shadow-3">
              <Search size={18} className="text-neutral-400" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="Search a hashtag, e.g. SaudiBusiness"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
            </div>
            <button onClick={submit}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-accent-800 px-5 py-3 text-sm font-semibold text-primary-900 transition hover:brightness-95">
              <Search size={16} /> Search
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-white/60">Try:</span>
            {FEATURED.slice(0, 5).map((f) => (
              <button key={f.tag} onClick={() => searchTag(f.tag)}
                className="rounded-full border border-white/25 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90 transition hover:bg-white/15">
                #{f.tag}
              </button>
            ))}
          </div>
        </div>
      </DemoCard>

      {/* ── Active searches ─────────────────────────────────────────────── */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-600">Your searches:</span>
          {tags.map((t) => (
            <span key={t} className="flex items-center gap-1.5 rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium text-primary-900">
              #{t}
              <button onClick={() => removeTag(t)} className="text-primary-900/60 hover:text-primary-900"><X size={12} /></button>
            </span>
          ))}
          <button onClick={() => refresh()} disabled={loading}
            className="ml-auto flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {loading && !raw ? (
        <DemoCard className="py-12 text-center text-sm text-neutral-500">Searching Instagram hashtags…</DemoCard>
      ) : hasResults ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Hashtags found" value={String(data.hashtags.length)} />
            <StatCard label="With live posts" value={String(readable.length)} />
            <StatCard label="Top-post engagement" value={formatFollowers(totalEng)} />
            <StatCard label="Leading hashtag" value={leader ? `#${leader.tag}` : '—'} />
          </div>

          {leader && (
            <DemoCard className="flex items-start gap-3 bg-primary-100 py-4 text-sm text-primary-900">
              <Sparkles size={18} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold">#{leader.tag}</span> is driving the most engagement of the hashtags you searched right now
                ({formatFollowers(leader.topEng)} across its top posts). Use these top posts as content inspiration.
              </p>
            </DemoCard>
          )}

          {data.hashtags.map((h) => <HashtagBlock key={h.tag} h={h} />)}
        </>
      ) : (
        <>
          {/* Landing: featured hashtags (always ≥ 4 entry points) */}
          <div className="flex items-center justify-between">
            <h2 className="font-Sora text-base font-semibold text-text-dark">Featured hashtags</h2>
            <span className="text-xs text-neutral-500">Curated for the Eastern Province</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((f) => (
              <FeaturedCard key={f.tag} tag={f.tag} label={f.label} onSearch={() => searchTag(f.tag)} />
            ))}
          </div>

          {!data.available && (
            <DemoCard className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Hash size={20} /></span>
              <div>
                <p className="font-Sora text-sm font-semibold">Connect Instagram to see live posts</p>
                <p className="mt-1 max-w-md text-sm text-neutral-500">
                  Hashtag discovery uses the Instagram Hashtag Search API, so it needs a connected Instagram Business account.
                  Pick a hashtag above to queue it — results appear once Instagram is connected.
                </p>
              </div>
              <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect Instagram →</a>
            </DemoCard>
          )}
        </>
      )}

      {/* ── Info note ───────────────────────────────────────────────────── */}
      <DemoCard className="flex items-start gap-3 py-5 text-sm text-neutral-600">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-neutral-400" />
        <p>
          Posts are live from the Instagram Hashtag Search API. Meta hides the author's username on hashtag results, and limits an
          account to <span className="font-medium">30 unique hashtags per 7 days</span> — results are cached 6 hours to stay within it.
          This is the legitimate alternative to reading competitor Pages (which Meta gates behind App Review).
        </p>
      </DemoCard>
    </div>
  );
}
