'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Check, Clock, Inbox as InboxIcon, CheckCircle2, ExternalLink, Heart, RefreshCw } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, PlatformChip } from '../_components/ui';
import { getPlatform, TPlatformId } from '@/mock-server/platforms';

interface ApiReply { id: string; author: string; text: string; time: string; fromPage?: boolean }
interface ApiItem {
  id: string; platform: TPlatformId; accountId: string; author: string; text: string;
  time: string; likeCount?: number; postId: string; postExcerpt?: string; permalink?: string; replies: ApiReply[];
}

// A conversation = a top-level comment + its reply thread, mapped from real data.
interface Msg { from: 'them' | 'us'; text: string; time: string }
interface Convo {
  id: string; accountId: string; platform: TPlatformId; name: string; time: string;
  unread: boolean; permalink?: string; postExcerpt?: string; likeCount: number; messages: Msg[];
}

const SAVED_REPLIES = [
  'Thanks for reaching out! 🙏',
  'Great question — our team will follow up shortly.',
  'You can find more details on our page.',
  'We appreciate your support! 🙌',
];

const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
const when = (iso: string) => (iso ? iso.slice(0, 16).replace('T', ' ') : 'now');

function toConvos(items: ApiItem[]): Convo[] {
  return items.map((it) => ({
    id: it.id,
    accountId: it.accountId,
    platform: it.platform,
    name: it.author,
    time: when(it.time),
    unread: it.replies.length === 0, // not replied to yet
    permalink: it.permalink,
    postExcerpt: it.postExcerpt,
    likeCount: it.likeCount ?? 0,
    messages: [
      { from: 'them', text: it.text, time: when(it.time) },
      ...it.replies.map((r) => ({ from: r.fromPage ? ('us' as const) : ('them' as const), text: r.text, time: when(r.time) })),
    ],
  }));
}

export default function Inbox() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/inbox', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const cs = toConvos(d.items ?? []);
        setConvos(cs);
        setActiveId((cur) => cur ?? cs[0]?.id ?? null);
      })
      .catch(() => setConvos([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const active = useMemo(() => convos.find((c) => c.id === activeId) ?? null, [convos, activeId]);
  const open = (id: string) => { setActiveId(id); setErr(''); setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: false } : c))); };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || !active || sending) return;
    setSending(true);
    setErr('');
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: active.platform, accountId: active.accountId, commentId: active.id, message: t }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, { from: 'us', text: t, time: 'now' }] } : c)));
        setDraft('');
      } else {
        setErr(j.error || 'Reply failed');
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[560px] flex-col gap-4 lg:h-[calc(100vh-7rem)]">
      <div className="flex items-end justify-between gap-3">
        <SectionTitle title="Inbox" subtitle="Real comments on your connected Pages — reply and resolve." />
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Conversation list */}
        <DemoCard className="flex max-h-[60vh] flex-col overflow-hidden p-0 lg:col-span-1 lg:max-h-none">
          <div className="border-b border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500">
            {loading ? 'Loading…' : `${convos.length} comment${convos.length === 1 ? '' : 's'}`}
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 && !loading && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-neutral-500">
                <InboxIcon size={20} /> No comments yet
              </div>
            )}
            {convos.map((c) => (
              <button key={c.id} onClick={() => open(c.id)}
                className={cn('flex w-full items-start gap-3 border-b border-neutral-100 p-3 text-left transition-colors', activeId === c.id ? 'bg-primary-100' : 'hover:bg-neutral-100/60')}>
                <div className="relative">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">{initials(c.name)}</span>
                  <span className="absolute -bottom-1 -right-1"><PlatformChip platform={c.platform} /></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between"><span className="truncate text-sm font-medium text-text-dark">{c.name}</span><span className="shrink-0 text-[11px] text-neutral-400">{c.time.slice(5)}</span></div>
                  <p className="flex items-center gap-1 truncate text-xs text-neutral-500"><MessageCircle size={11} /> {c.messages[c.messages.length - 1].text}</p>
                </div>
                {c.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-800" />}
              </button>
            ))}
          </div>
        </DemoCard>

        {/* Thread */}
        <DemoCard className="flex min-h-[70vh] flex-col overflow-hidden p-0 lg:col-span-2 lg:min-h-0">
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <PlatformChip platform={active.platform} size="md" />
                  <div><p className="text-sm font-semibold text-text-dark">{active.name}</p><p className="text-xs text-neutral-500">{getPlatform(active.platform).name} comment{active.postExcerpt ? ` · on “${active.postExcerpt}…”` : ''}</p></div>
                </div>
                {active.permalink && (
                  <a href={active.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"><ExternalLink size={13} /> Open</a>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-surface-background p-4">
                {active.messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.from === 'us' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', m.from === 'us' ? 'rounded-br-sm bg-primary-800 text-white' : 'rounded-bl-sm border border-neutral-200 bg-white text-neutral-800')}>
                      {m.text}<span className={cn('mt-1 block text-[10px]', m.from === 'us' ? 'text-white/70' : 'text-neutral-400')}>{m.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="border-t border-neutral-200 p-3">
                {err && <p className="mb-2 text-xs text-text-red">{err}</p>}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SAVED_REPLIES.map((r) => (
                    <button key={r} onClick={() => setDraft(r)} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:border-primary-300 hover:bg-primary-100">{r.length > 30 ? `${r.slice(0, 30)}…` : r}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(draft)} placeholder={`Reply to ${active.name}…`}
                    className="min-h-10 flex-1 rounded-lg px-3 py-2 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300" />
                  <button onClick={() => send(draft)} disabled={!draft.trim() || sending} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-800 text-white transition-opacity disabled:opacity-50"><Send size={16} /></button>
                </div>
              </div>
            </>
          ) : <div className="flex flex-1 items-center justify-center text-sm text-neutral-500"><Check size={16} className="mr-2" /> {loading ? 'Loading…' : 'All caught up.'}</div>}
        </DemoCard>

        {/* Contact details */}
        <DemoCard className="flex flex-col gap-4 overflow-y-auto lg:col-span-1">
          {active ? (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="relative">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-neutral-700">{initials(active.name)}</span>
                  <span className="absolute bottom-0 right-0"><PlatformChip platform={active.platform} size="md" /></span>
                </span>
                <div><p className="font-Sora text-base font-semibold text-text-dark">{active.name}</p><p className="text-xs text-neutral-500">{getPlatform(active.platform).name}</p></div>
                <span className="rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium capitalize text-primary-900">comment · {getPlatform(active.platform).name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Heart} label="Likes" value={`${active.likeCount}`} />
                <Stat icon={MessageCircle} label="Replies" value={`${active.messages.filter((m) => m.from === 'us').length}`} />
                <Stat icon={Clock} label="When" value={active.time.slice(5)} />
                <Stat icon={CheckCircle2} label="Status" value={active.messages.some((m) => m.from === 'us') ? 'Replied' : 'Open'} />
              </div>

              {active.permalink && (
                <a href={active.permalink} target="_blank" rel="noreferrer" className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary-800 py-2 text-sm font-semibold text-white hover:bg-primary-900"><ExternalLink size={14} /> View on {getPlatform(active.platform).name}</a>
              )}
            </>
          ) : <p className="text-sm text-neutral-500">Select a comment.</p>}
        </DemoCard>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) => (
  <div className="rounded-lg border border-neutral-200 p-3">
    <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Icon size={12} /> {label}</p>
    <p className="mt-1 text-sm font-semibold text-text-dark">{value}</p>
  </div>
);
