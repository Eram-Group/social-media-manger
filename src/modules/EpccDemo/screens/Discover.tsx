'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Hash, RefreshCw, ExternalLink, AlertCircle, Plus, X, Heart, MessageCircle,
  TrendingUp, Sparkles, Film, Images,
} from 'lucide-react';
import { DemoCard, SectionTitle, StatCard, formatFollowers } from '../_components/ui';
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

// Persist the user's ad-hoc hashtags locally (mirrors the Competitors screen's
// manual-entry pattern). The server already tracks a curated default list.
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

export default function Discover() {
  const { tags, save } = useTrackedTags();
  const [input, setInput] = useState('');

  // Ad-hoc tags ride along as ?tags=… ; the server merges them with its curated list.
  const url = useMemo(() => {
    const q = tags.map((t) => encodeURIComponent(t)).join(',');
    return q ? `/api/discover?tags=${q}` : '/api/discover';
  }, [tags]);

  const { data: raw, loading, refresh } = useApi<Discover>(url);
  const data = raw ?? { available: false, hashtags: [] };

  const addTag = () => {
    const clean = input.replace(/^#/, '').trim();
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) save([...tags, clean]);
    setInput('');
  };
  const removeTag = (t: string) => save(tags.filter((x) => x !== t));

  const totalEng = data.hashtags.reduce((s, h) => s + h.topEng, 0);
  const readable = data.hashtags.filter((h) => !h.error);
  const leader = readable[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          title="Content Discovery"
          subtitle="Top & recent public posts for the hashtags you track — real Instagram data, no competitor access needed." />
        <button onClick={() => refresh()} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Track-a-hashtag bar */}
      <DemoCard className="py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5">
            <Hash size={16} className="text-neutral-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
              placeholder="Track a hashtag (e.g. SaudiBusiness)…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          </div>
          <button onClick={addTag}
            className="flex items-center gap-1.5 rounded-lg bg-primary-800 px-3 py-2 text-sm font-medium text-white hover:bg-primary-900">
            <Plus size={15} /> Track
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium text-primary-900">
                #{t}
                <button onClick={() => removeTag(t)} className="text-primary-900/60 hover:text-primary-900"><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </DemoCard>

      {loading && !raw ? (
        <DemoCard className="py-12 text-center text-sm text-neutral-500">Searching Instagram hashtags…</DemoCard>
      ) : !data.available ? (
        <DemoCard className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Hash size={22} /></span>
          <div>
            <p className="font-Sora text-base font-semibold">Connect an Instagram account</p>
            <p className="mt-1 max-w-md text-sm text-neutral-500">
              Hashtag discovery uses the Instagram Hashtag Search API, so it needs a connected Instagram Business account.
            </p>
          </div>
          <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect Instagram →</a>
        </DemoCard>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Hashtags tracked" value={String(data.hashtags.length)} />
            <StatCard label="Readable" value={String(readable.length)} />
            <StatCard label="Top-post engagement" value={formatFollowers(totalEng)} />
            <StatCard label="Leading hashtag" value={leader ? `#${leader.tag}` : '—'} />
          </div>

          {leader && (
            <DemoCard className="flex items-start gap-3 bg-primary-100 py-4 text-sm text-primary-900">
              <Sparkles size={18} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold">#{leader.tag}</span> is driving the most engagement of the hashtags you track right now
                ({formatFollowers(leader.topEng)} across its top posts). Use these top posts as content inspiration.
              </p>
            </DemoCard>
          )}

          {data.hashtags.length === 0 ? (
            <DemoCard className="py-10 text-center text-sm text-neutral-500">No hashtags tracked. Add one above to start discovering content.</DemoCard>
          ) : (
            data.hashtags.map((h) => <HashtagBlock key={h.tag} h={h} />)
          )}

          <DemoCard className="flex items-start gap-3 py-5 text-sm text-neutral-600">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-neutral-400" />
            <p>
              Posts are live from the Instagram Hashtag Search API. Meta hides the author's username on hashtag results, and limits an
              account to <span className="font-medium">30 unique hashtags per 7 days</span> — results are cached 6 hours to stay within it.
              This is the legitimate alternative to reading competitor Pages (which Meta gates behind App Review).
            </p>
          </DemoCard>
        </>
      )}
    </div>
  );
}
