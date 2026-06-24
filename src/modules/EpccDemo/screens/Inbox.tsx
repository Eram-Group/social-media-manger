'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, AtSign, MessageSquare, MessageCircle, Check, Clock, Inbox as InboxIcon, CheckCircle2, ExternalLink, Heart, RefreshCw } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, PlatformChip } from '../_components/ui';
import { DsSelect } from '../_components/form';
import { useApi } from '../_services/useApi';
import { TEAM, SAVED_REPLIES, TConvType } from '@/mock-server/inbox';
import { getPlatform, TPlatformId } from '@/mock-server/platforms';

interface Msg { from: 'them' | 'us'; text: string; time: string }
interface Convo {
  id: string; accountId: string; platform: TPlatformId; name: string; handle: string;
  type: TConvType; time: string; unread: boolean; assignee: string; resolved: boolean;
  permalink?: string; likeCount: number; messages: Msg[];
}

const typeIcon: Record<TConvType, typeof AtSign> = { comment: MessageCircle, dm: MessageSquare, mention: AtSign };
const FILTERS: { key: 'all' | TConvType; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'comment', label: 'Comments' }, { key: 'dm', label: 'Messages' }, { key: 'mention', label: 'Mentions' },
];
const initials = (n: string) => n.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();
const when = (iso: string) => (iso ? iso.slice(0, 16).replace('T', ' ').slice(5) : 'now');

export default function Inbox() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TConvType>('all');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const { data, loading, refresh } = useApi<{ items: any[] }>('/api/inbox');
  const load = () => refresh();

  // Seed the local conversation list whenever the API data changes (instant from
  // the client cache on revisits, so no loading flash).
  useEffect(() => {
    if (!data) return;
    const cs: Convo[] = (data.items ?? []).map((it: any) => ({
      id: it.id, accountId: it.accountId, platform: it.platform,
      name: it.author, handle: it.platform === 'instagram' ? `@${it.author}` : '',
      type: 'comment' as TConvType, time: when(it.time), unread: (it.replies?.length ?? 0) === 0,
      assignee: 'Unassigned', resolved: false, permalink: it.permalink, likeCount: it.likeCount ?? 0,
      messages: [
        { from: 'them' as const, text: it.text, time: when(it.time) },
        ...(it.replies ?? []).map((r: any) => ({ from: r.fromPage ? ('us' as const) : ('them' as const), text: r.text, time: when(r.time) })),
      ],
    }));
    setConvos(cs);
    setActiveId((cur) => cur ?? cs[0]?.id ?? null);
  }, [data]);

  const list = useMemo(() => convos.filter((c) => filter === 'all' || c.type === filter), [convos, filter]);
  const active = convos.find((c) => c.id === activeId) ?? null;

  const open = (id: string) => { setActiveId(id); setErr(''); setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: false } : c))); };
  const assign = (who: string) => active && setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, assignee: who } : c)));
  const resolve = () => active && setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, resolved: !c.resolved } : c)));

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || !active || sending) return;
    setSending(true); setErr('');
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: active.platform, accountId: active.accountId, commentId: active.id, message: t }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, { from: 'us', text: t, time: 'now' }] } : c)));
        setDraft('');
      } else setErr(j.error || 'Reply failed');
    } catch (e) { setErr((e as Error).message); } finally { setSending(false); }
  };

  const countFor = (k: 'all' | TConvType) => (k === 'all' ? convos.length : convos.filter((c) => c.type === k).length);

  return (
    <div className="flex min-h-[560px] flex-col gap-4 lg:h-[calc(100vh-7rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Inbox" subtitle="Comments, messages and mentions across all platforms — reply, assign and resolve." />
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Conversation list */}
        <DemoCard className="flex max-h-[60vh] flex-col overflow-hidden p-0 lg:col-span-1 lg:max-h-none">
          <div className="flex gap-1 border-b border-neutral-200 p-2">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn('flex-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors', filter === f.key ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100')}>
                {f.label}{countFor(f.key) > 0 ? ` (${countFor(f.key)})` : ''}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-neutral-500">
                <InboxIcon size={20} /> {loading ? 'Loading…' : filter === 'all' ? 'No comments yet' : `No ${filter === 'dm' ? 'messages' : filter + 's'}`}
              </div>
            )}
            {list.map((c) => {
              const TypeIcon = typeIcon[c.type];
              return (
                <button key={c.id} onClick={() => open(c.id)}
                  className={cn('flex w-full items-start gap-3 border-b border-neutral-100 p-3 text-left transition-colors', activeId === c.id ? 'bg-primary-100' : 'hover:bg-neutral-100/60')}>
                  <div className="relative">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">{initials(c.name)}</span>
                    <span className="absolute -bottom-1 -right-1"><PlatformChip platform={c.platform} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between"><span className="truncate text-sm font-medium text-text-dark">{c.name}</span><span className="shrink-0 text-[11px] text-neutral-400">{c.time}</span></div>
                    <p className="flex items-center gap-1 truncate text-xs text-neutral-500"><TypeIcon size={11} /> {c.messages[c.messages.length - 1].text}</p>
                  </div>
                  {c.resolved ? <CheckCircle2 size={14} className="mt-1 shrink-0 text-warnings-success" /> : c.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-800" />}
                </button>
              );
            })}
          </div>
        </DemoCard>

        {/* Thread */}
        <DemoCard className="flex min-h-[70vh] flex-col overflow-hidden p-0 lg:col-span-2 lg:min-h-0">
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <PlatformChip platform={active.platform} size="md" />
                  <div><p className="text-sm font-semibold text-text-dark">{active.name}</p><p className="text-xs text-neutral-500">{getPlatform(active.platform).name} {active.type}</p></div>
                </div>
                <button onClick={resolve} className={cn('flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium', active.resolved ? 'bg-neutral-100 text-neutral-600' : 'bg-warnings-successBg text-warnings-success')}>
                  <CheckCircle2 size={13} /> {active.resolved ? 'Resolved' : 'Resolve'}
                </button>
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
                <div><p className="font-Sora text-base font-semibold text-text-dark">{active.name}</p><p className="text-xs text-neutral-500">{active.handle || getPlatform(active.platform).name}</p></div>
                <span className="rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium capitalize text-primary-900">{active.type} · {getPlatform(active.platform).name}</span>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">Assigned to</p>
                <div className="mt-1.5"><DsSelect value={active.assignee} onChange={assign} options={TEAM.map((t) => ({ value: t, label: t }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Heart} label="Likes" value={`${active.likeCount}`} />
                <Stat icon={MessageCircle} label="Replies" value={`${active.messages.filter((m) => m.from === 'us').length}`} />
                <Stat icon={Clock} label="When" value={active.time} />
                <Stat icon={CheckCircle2} label="Status" value={active.resolved ? 'Resolved' : active.messages.some((m) => m.from === 'us') ? 'Replied' : 'Open'} />
              </div>

              {active.permalink && (
                <a href={active.permalink} target="_blank" rel="noreferrer" className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-primary-800 py-2 text-sm font-semibold text-white hover:bg-primary-900"><ExternalLink size={14} /> View on {getPlatform(active.platform).name}</a>
              )}
            </>
          ) : <p className="text-sm text-neutral-500">Select a conversation.</p>}
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
