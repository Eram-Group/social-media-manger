'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { ArrowLeft, Eye, TrendingUp, Megaphone, Trash2, Pencil, Heart, Send, MessageCircle, Ban, CornerDownRight, ShieldCheck, EyeOff, RotateCcw, Smartphone, X, Layers, Share2, Bookmark, MousePointerClick, Users, Play, Clock } from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, StatusPill, PlatformChip, formatFollowers, CHART_COLORS } from '../_components/ui';
import { usePosts } from '@/mock-server/posts-store';
import { getPostAnalytics, IPost, TPostStatus } from '@/mock-server/posts';
import { getPlatform, platformChartColor, TPlatformId } from '@/mock-server/platforms';
import PostMedia from '../_components/PostMedia';
import PreviewCarousel from '../_components/PreviewCarousel';
import { Backdrop, ModalPanel } from '../_components/motion';
import { EPCC_ROUTES } from '../routes';

const tone: Record<TPostStatus, 'success' | 'info' | 'caution'> = { published: 'success', scheduled: 'info', draft: 'caution' };
const REACTIONS = [
  { key: 'like', emoji: '👍', label: 'Like', w: 0.55 },
  { key: 'love', emoji: '❤️', label: 'Love', w: 0.25 },
  { key: 'celebrate', emoji: '🎉', label: 'Celebrate', w: 0.1 },
  { key: 'insightful', emoji: '💡', label: 'Insightful', w: 0.07 },
  { key: 'support', emoji: '🤝', label: 'Support', w: 0.03 },
];
interface IReply { id: string; text: string; time: string; likes: number; liked?: boolean }
interface IComment { id: string; name: string; platform: TPlatformId; text: string; time: string; likes: number; liked?: boolean; replies: IReply[] }
const SEED_COMMENTS: IComment[] = [
  { id: 'c1', name: 'Khalid Al-Dossari', platform: 'instagram', text: 'Excellent initiative — looking forward to attending! 👏', time: '2h', likes: 12, replies: [{ id: 'r0', text: 'Thank you Khalid! See you there 🙌', time: '1h', likes: 5 }] },
  { id: 'c2', name: 'Noura Al-Harbi', platform: 'x', text: 'How can our SME register as an exhibitor?', time: '3h', likes: 4, replies: [] },
  { id: 'c3', name: 'Faisal Qahtani', platform: 'linkedin', text: 'Great to see the Chamber leading on Vision 2030.', time: '5h', likes: 21, replies: [] },
  { id: 'c4', name: 'Mona Al-Shamri', platform: 'facebook', text: 'Is this open to non-members too?', time: '6h', likes: 3, replies: [] },
  { id: 'c5', name: 'Yousef Al-Otaibi', platform: 'tiktok', text: 'More behind-the-scenes content please 🔥', time: '8h', likes: 34, replies: [] },
  { id: 'c6', name: 'Reem Al-Harbi', platform: 'instagram', text: 'Will the sessions be recorded?', time: '9h', likes: 7, replies: [] },
  { id: 'c7', name: 'Abdullah Al-Shehri', platform: 'linkedin', text: 'Fantastic to see this level of engagement.', time: '11h', likes: 18, replies: [] },
];

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { posts, deletePost } = usePosts();
  const post = posts.find((p) => p.id === id);

  // Real comments fetched for this post (see effect below).
  const [comments, setComments] = useState<IComment[]>([]);
  const [draft, setDraft] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [role, setRole] = useState<'manager' | 'viewer'>('manager');
  const [commentPlatform, setCommentPlatform] = useState<'all' | TPlatformId>('all');
  const [commentSort, setCommentSort] = useState<'new' | 'top'>('new');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  // Live metrics for posts that were really published to a connected platform.
  const ref = post?.remoteRefs?.[0];
  const [live, setLive] = useState<{ loading: boolean; error?: string; data?: any }>({ loading: false });
  const loadLive = () => {
    if (!ref) return;
    setLive({ loading: true });
    fetch(`/api/posts/insights?platform=${ref.platform}&accountId=${ref.accountId}&remoteId=${encodeURIComponent(ref.remoteId)}`)
      .then((r) => r.json())
      .then((d) => setLive(d.ok ? { loading: false, data: d } : { loading: false, error: d.error }))
      .catch((e) => setLive({ loading: false, error: (e as Error).message }));
  };
  useEffect(() => {
    if (!ref) return;
    loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.platform, ref?.accountId, ref?.remoteId]);

  // Load real comments for THIS specific post directly (reliable for any post).
  useEffect(() => {
    if (!ref) { setComments([]); return; }
    let active = true;
    fetch(`/api/posts/comments?platform=${ref.platform}&accountId=${ref.accountId}&remoteId=${encodeURIComponent(ref.remoteId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const real: IComment[] = (d.comments ?? []).map((c: any) => ({
          id: c.id, name: c.author, platform: ref.platform, text: c.text, time: (c.time || '').slice(0, 10), likes: c.likeCount ?? 0,
          replies: (c.replies ?? []).map((rep: any) => ({ id: rep.id, text: `${rep.fromPage ? '' : rep.author + ': '}${rep.text}`, time: (rep.time || '').slice(0, 10), likes: 0 })),
        }));
        setComments(real);
      })
      .catch(() => active && setComments([]));
    return () => { active = false; };
  }, [ref?.remoteId, ref?.platform]);

  if (!post) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-neutral-600">This post no longer exists.</p>
        <Link href={EPCC_ROUTES.POSTS} className="text-sm font-medium text-primary-800 hover:underline">← Back to Posts</Link>
      </div>
    );
  }

  const a = getPostAnalytics(post);
  const curve = a.reachCurve;
  const engagement = [{ name: 'Likes', value: a.likes }, { name: 'Comments', value: a.comments }, { name: 'Shares', value: a.shares }, { name: 'Saves', value: a.saves }];
  const reactionData = REACTIONS.map((r) => ({ ...r, value: Math.max(1, Math.round(a.likes * r.w)) }));
  const totalReactions = reactionData.reduce((s, r) => s + r.value, 0);

  const canModerate = role === 'manager';
  const shownComments = comments
    .filter((c) => commentPlatform === 'all' || c.platform === commentPlatform)
    .slice()
    .sort((x, y) => (commentSort === 'top' ? y.likes - x.likes : 0));
  const addComment = () => {
    const t = draft.trim(); if (!t) return;
    setComments((c) => [{ id: `c_${c.length}_${t.length}`, name: 'EP Chamber', platform: commentPlatform === 'all' ? (post.platforms[0] ?? 'x') : commentPlatform, text: t, time: 'now', likes: 0, replies: [] }, ...c]);
    setDraft('');
  };
  const [replyBusy, setReplyBusy] = useState(false);
  const addReply = async (cid: string) => {
    const t = replyDraft.trim();
    if (!t || !ref || replyBusy) return;
    setReplyBusy(true);
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: ref.platform, accountId: ref.accountId, commentId: cid, message: t }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setComments((cs) => cs.map((c) => (c.id === cid ? { ...c, replies: [...c.replies, { id: j.id || `r_${c.replies.length}`, text: t, time: 'now', likes: 0 }] } : c)));
        setReplyDraft(''); setReplyingTo(null);
      } else {
        alert(`Reply failed: ${j.error || 'unknown error'}`);
      }
    } catch (e) {
      alert(`Reply failed: ${(e as Error).message}`);
    } finally {
      setReplyBusy(false);
    }
  };
  // Real moderation: hide or delete a comment on the platform.
  const moderate = async (cid: string, action: 'hide' | 'delete') => {
    if (!ref) return;
    const prev = comments;
    setComments((cs) => cs.filter((c) => c.id !== cid)); // optimistic
    try {
      const res = await fetch('/api/inbox/comment-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, platform: ref.platform, accountId: ref.accountId, commentId: cid }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { alert(`${action} failed: ${j.error || 'error'}`); setComments(prev); }
    } catch (e) {
      alert(`${action} failed: ${(e as Error).message}`); setComments(prev);
    }
  };
  const deleteComment = (cid: string) => moderate(cid, 'hide');
  const deleteReply = (cid: string, rid: string) => setComments((cs) => cs.map((c) => (c.id === cid ? { ...c, replies: c.replies.filter((r) => r.id !== rid) } : c)));
  const toggleBlock = (name: string) => setBlocked((b) => (b.includes(name) ? b.filter((x) => x !== name) : [...b, name]));
  const likeComment = (cid: string) => canModerate && setComments((cs) => cs.map((c) => (c.id === cid ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : c)));
  const likeReply = (cid: string, rid: string) => canModerate && setComments((cs) => cs.map((c) => (c.id === cid ? { ...c, replies: c.replies.map((r) => (r.id === rid ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) } : r)) } : c)));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(EPCC_ROUTES.POSTS)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100"><ArrowLeft size={16} /></button>
          <SectionTitle title="Post analytics" subtitle={`${post.date} · ${post.time}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {post.platforms.length > 0 && <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900"><Smartphone size={15} /> Live preview</button>}
          {post.status !== 'published' && <Link href={EPCC_ROUTES.POSTS} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"><Pencil size={15} /> Manage</Link>}
          <Link href={`${EPCC_ROUTES.PROMOTION}?post=${post.id}`} className="flex items-center gap-2 rounded-lg bg-secondary-200 px-4 py-2 text-sm font-medium text-primary-900 hover:shadow-1"><Megaphone size={15} /> Promote</Link>
          <button onClick={() => { deletePost(post.id); router.push(EPCC_ROUTES.POSTS); }} className="flex items-center gap-2 rounded-lg bg-text-red/5 px-4 py-2 text-sm font-medium text-text-red hover:bg-text-red/10"><Trash2 size={15} /> Delete</button>
        </div>
      </div>

      {/* Live metrics — only for posts really published to a connected platform */}
      {ref && (
        <DemoCard className="flex flex-col gap-4 border-warnings-success/30 bg-warnings-successBg/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-warnings-success/15 px-2.5 py-1 text-xs font-semibold text-warnings-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warnings-success" /> LIVE
              </span>
              <PlatformChip platform={ref.platform} size="sm" withLabel />
              <span className="text-sm text-neutral-600">Real metrics from {getPlatform(ref.platform).name}</span>
            </div>
            <div className="flex items-center gap-3">
              {(live.data?.permalink || ref.url) && (
                <a href={live.data?.permalink || ref.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary-800 hover:underline">View live post ↗</a>
              )}
              <button onClick={loadLive} disabled={live.loading} className="flex items-center gap-1 text-xs font-medium text-neutral-700 hover:underline disabled:opacity-50">
                <RotateCcw size={13} className={cn(live.loading && 'animate-spin')} /> Refresh
              </button>
            </div>
          </div>
          {live.error ? (
            <p className="text-sm text-text-red">Couldn’t load live metrics: {live.error}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LiveStat label="Likes" value={live.loading ? '…' : (live.data?.metrics?.likes ?? 0).toLocaleString()} />
              <LiveStat label="Comments" value={live.loading ? '…' : (live.data?.metrics?.comments ?? 0).toLocaleString()} />
              <LiveStat label="Shares" value={live.loading ? '…' : (live.data?.metrics?.shares ?? 0).toLocaleString()} />
              {live.data?.metrics?.saved != null && <LiveStat label="Saves" value={(live.data.metrics.saved).toLocaleString()} />}
              {live.data?.metrics?.views != null && <LiveStat label="Views" value={(live.data.metrics.views).toLocaleString()} />}
              {live.data?.metrics?.clicks != null && <LiveStat label="Link clicks" value={(live.data.metrics.clicks).toLocaleString()} />}
              {live.data?.metrics?.videoViews != null && <LiveStat label="Video views" value={(live.data.metrics.videoViews).toLocaleString()} />}
            </div>
          )}
          {/* Reaction breakdown (real, when available) */}
          {!live.error && live.data?.reactions && Object.keys(live.data.reactions).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(live.data.reactions as Record<string, number>).filter(([, n]) => n > 0).map(([k, n]) => (
                <span key={k} className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700">
                  <span className="capitalize">{k}</span> {n.toLocaleString()}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-neutral-500">Facebook no longer exposes reach/impressions via the API; these are the real metrics it still provides.</p>
        </DemoCard>
      )}

      {/* Post hero */}
      <DemoCard className="flex flex-col gap-5 lg:flex-row">
        {(post.video || post.media?.length) ? <div className="lg:w-[44%] lg:shrink-0"><PostMedia post={post} /></div> : null}
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={tone[post.status]}>{post.status}</StatusPill>
            {post.format && <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600"><Layers size={11} /> {post.format}</span>}
            {post.campaign && <StatusPill tone="info">▣ {post.campaign}</StatusPill>}
          </div>
          <p className="whitespace-pre-line text-base leading-relaxed text-neutral-900">{post.content}</p>
          <div className="mt-auto flex flex-wrap gap-1.5">
            {post.platforms.map((pl) => <span key={pl} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-1 text-xs"><PlatformChip platform={pl} /> {getPlatform(pl).name}</span>)}
          </div>
        </div>
      </DemoCard>

      {post.status !== 'published' && (
        <DemoCard className="py-12 text-center text-sm text-neutral-600">This post is <span className="font-medium">{post.status}</span> — analytics will appear once it's published.</DemoCard>
      )}

      {post.status === 'published' && (
        <>
          {/* comments (real) */}
          <div className="grid grid-cols-1 gap-6">
            <DemoCard>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionTitle title="Comments" subtitle={`${comments.length} comments · ${blocked.length} blocked`} />
                {/* access role */}
                <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 p-0.5">
                  {(['manager', 'viewer'] as const).map((r) => (
                    <button key={r} onClick={() => setRole(r)} title={r === 'manager' ? 'Full moderation access' : 'Read-only'}
                      className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors', role === r ? 'bg-primary-800 text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
                      {r === 'manager' ? <ShieldCheck size={12} /> : <Eye size={12} />} {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* platform filter + sort */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button onClick={() => setCommentPlatform('all')} className={cn('rounded-full border px-2.5 py-1 text-xs', commentPlatform === 'all' ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100')}>All</button>
                {post.platforms.map((pl) => (
                  <button key={pl} onClick={() => setCommentPlatform(pl)} className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', commentPlatform === pl ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100')}>
                    <PlatformChip platform={pl} /> {getPlatform(pl).name}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-neutral-200 p-0.5">
                  {(['new', 'top'] as const).map((s) => (
                    <button key={s} onClick={() => setCommentSort(s)} className={cn('rounded-md px-2 py-1 text-xs font-medium', commentSort === s ? 'bg-primary-800 text-white' : 'text-neutral-600 hover:bg-neutral-100')}>{s === 'new' ? 'Newest' : 'Top'}</button>
                  ))}
                </div>
              </div>

              {/* add comment (manager only) */}
              {canModerate ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-xs font-semibold text-white">EP</span>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComment()} placeholder="Comment as the Chamber…"
                    className="min-h-9 flex-1 rounded-lg px-3 py-1.5 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300" />
                  <button onClick={addComment} disabled={!draft.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-800 text-white disabled:opacity-50"><Send size={15} /></button>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-neutral-100 p-2.5 text-xs text-neutral-500">Viewer access — moderation actions are disabled. Switch to Manager to reply, hide or block.</p>
              )}

              <div className="mt-4 flex flex-col divide-y divide-neutral-100">
                {shownComments.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">No comments on this platform.</p>}
                {shownComments.map((c) => {
                  const isBlocked = blocked.includes(c.name);
                  return (
                    <div key={c.id} className="flex gap-3 py-3">
                      <span className="relative shrink-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">{c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                        <span className="absolute -bottom-1 -right-1"><PlatformChip platform={c.platform} /></span>
                      </span>
                      <div className="min-w-0 flex-1">
                        {isBlocked ? (
                          <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2">
                            <span className="flex items-center gap-1.5 text-xs text-neutral-500"><Ban size={12} /> {c.name} blocked — comment hidden</span>
                            {canModerate && <button onClick={() => toggleBlock(c.name)} className="flex items-center gap-1 text-xs font-medium text-primary-800 hover:underline"><RotateCcw size={11} /> Unblock</button>}
                          </div>
                        ) : (
                          <>
                            <p className="text-sm"><span className="font-medium text-text-dark">{c.name}</span> <span className="text-xs text-neutral-400">· {c.time}</span></p>
                            <p className="text-sm text-neutral-700">{c.text}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                              <span className="flex items-center gap-1"><Heart size={12} /> {c.likes}</span>
                              {canModerate && <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)} className="flex items-center gap-1 font-medium text-primary-800 hover:underline"><CornerDownRight size={11} /> Reply</button>}
                              {canModerate && <button onClick={() => moderate(c.id, 'hide')} className="flex items-center gap-1 font-medium text-neutral-500 hover:text-text-red"><EyeOff size={11} /> Hide</button>}
                              {canModerate && <button onClick={() => { if (confirm('Delete this comment from the platform?')) moderate(c.id, 'delete'); }} className="flex items-center gap-1 font-medium text-neutral-500 hover:text-text-red"><Trash2 size={11} /> Delete</button>}
                            </div>

                            {/* replies */}
                            {c.replies.length > 0 && (
                              <div className="mt-2 flex flex-col gap-1.5 border-l-2 border-neutral-200 pl-3">
                                {c.replies.map((r) => (
                                  <div key={r.id} className="flex items-start justify-between gap-2">
                                    <p className="text-sm text-neutral-700"><span className="font-medium text-primary-800">EP Chamber</span> {r.text} <span className="text-xs text-neutral-400">· {r.time}</span></p>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <button onClick={() => likeReply(c.id, r.id)} disabled={!canModerate} className={cn('flex items-center gap-1 text-xs', r.liked ? 'text-text-red' : 'text-neutral-400', canModerate && !r.liked && 'hover:text-text-red')}>
                                        <Heart size={11} className={cn(r.liked && 'fill-current')} /> {r.likes}
                                      </button>
                                      {canModerate && <button onClick={() => deleteReply(c.id, r.id)} className="text-neutral-400 hover:text-text-red" title="Delete reply"><Trash2 size={12} /></button>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* reply input */}
                            {canModerate && replyingTo === c.id && (
                              <div className="mt-2 flex items-center gap-2 pl-3">
                                <input autoFocus value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addReply(c.id)} placeholder={`Reply to ${c.name.split(' ')[0]}…`}
                                  className="min-h-8 flex-1 rounded-lg px-2.5 py-1 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300" />
                                <button onClick={() => addReply(c.id)} disabled={!replyDraft.trim()} className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800 text-white disabled:opacity-50"><Send size={13} /></button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DemoCard>
          </div>
        </>
      )}

      {/* Live preview modal */}
      <AnimatePresence>
        {previewOpen && post.platforms.length > 0 && (
          <Backdrop onClose={() => setPreviewOpen(false)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-7">
              <div className="mb-3 flex items-start justify-between">
                <SectionTitle title="Live preview" subtitle="How this post appears on each platform" />
                <button onClick={() => setPreviewOpen(false)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
              </div>
              <PreviewCarousel
                platforms={post.platforms}
                content={post.content}
                image={post.video ?? post.media?.[0]}
                images={post.media}
                isVideo={!!post.video}
                format={post.format}
              />
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

const ACCOUNT_AVG_ENG = 4.9; // account-wide average engagement, for benchmarking

const BigStat = ({ icon: Icon, label, value, delta, tint, sub }: { icon: typeof Eye; label: string; value: string; delta?: number; tint: string; sub?: string }) => (
  <DemoCard className="flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tint)}><Icon size={17} /></span>
      {delta != null && <span className={cn('flex items-center gap-0.5 text-xs font-medium', delta >= 0 ? 'text-warnings-success' : 'text-text-red')}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}
    </div>
    <p className="font-Sora text-2xl font-semibold text-text-dark">{value}</p>
    <p className="text-sm text-neutral-500">{label}</p>
    {sub && <p className="text-[11px] text-neutral-400">{sub}</p>}
  </DemoCard>
);

const Tile = ({ icon: Icon, tint, label, value }: { icon: typeof Eye; tint: string; label: string; value: string }) => (
  <DemoCard className="flex items-center gap-3 p-3.5">
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tint)}><Icon size={18} /></span>
    <div className="min-w-0">
      <p className="font-Sora text-lg font-semibold text-text-dark">{value}</p>
      <p className="truncate text-xs text-neutral-500">{label}</p>
    </div>
  </DemoCard>
);

const LiveStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-warnings-success/20 bg-white p-3">
    <p className="font-Sora text-xl font-semibold text-text-dark">{value}</p>
    <p className="text-xs text-neutral-500">{label}</p>
  </div>
);
