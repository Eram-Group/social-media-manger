'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Hash, RefreshCw, ExternalLink, AlertCircle, X, Heart, MessageCircle,
  Sparkles, Film, Images, Search, ArrowRight,
} from 'lucide-react';
import {
  DemoCard, SectionTitle, StatCard, StatCardSkeleton, Skeleton, formatFollowers,
} from '../_components/ui';
import { Input } from '@/shadecn/components/ui/input';
import { Button } from '@UI/index';
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
      className="group flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-7 transition hover:border-primary-300 hover:shadow-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-200 text-primary-900">
        <Hash size={18} />
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

// Loading placeholder that mirrors the results layout so the slow hashtag fetch
// feels responsive (a stat row + a couple of media-grid skeletons).
function ResultsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {Array.from({ length: 2 }).map((_, b) => (
        <DemoCard key={b}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div><Skeleton className="h-4 w-32" /><Skeleton className="mt-1.5 h-3 w-44" /></div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        </DemoCard>
      ))}
    </>
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
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          title="Content Discovery"
          subtitle="Search Instagram by hashtag — top & recent public posts, no competitor access needed." />
        {tags.length > 0 && (
          <Button variant="outline" size="medium" onClick={() => refresh()} disable={loading}
            leftIcon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
            className="w-auto">
            Refresh
          </Button>
        )}
      </div>

      {/* ── Search by hashtag ───────────────────────────────────────────── */}
      <DemoCard className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            leftIcon={<Search size={16} className="text-neutral-400" />}
            placeholder="Search a hashtag, e.g. SaudiBusiness"
            className="flex-1" />
          <Button variant="primary" size="medium" onClick={submit} loading={loading}
            leftIcon={loading ? undefined : <Search size={16} />} className="w-full sm:w-auto sm:px-6">
            Search
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-neutral-600">Your searches:</span>
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium text-primary-900">
                #{t}
                <button onClick={() => removeTag(t)} className="text-primary-900/60 hover:text-primary-900"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}

        {loading && (
          <p className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
            <RefreshCw size={13} className="animate-spin" />
            Searching Instagram… hashtag results can take a few seconds (Meta rate-limits them).
          </p>
        )}
      </DemoCard>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      {loading ? (
        <ResultsSkeleton />
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
