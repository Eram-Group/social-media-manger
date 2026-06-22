import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AtSign, MessageSquare, MessageCircle, Check, Clock, Inbox as InboxIcon, CheckCircle2, ExternalLink, StickyNote, Star, X } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, PlatformChip, formatFollowers } from '../_components/ui';
import { Backdrop, ModalPanel } from '../_components/motion';
import { DsSelect } from '../_components/form';
import { CONVERSATIONS, IConversation, IInboxMsg, TConvType, TEAM, SAVED_REPLIES } from '@/mock-server/inbox';
import { getPlatform } from '@/mock-server/platforms';

const typeIcon: Record<TConvType, typeof AtSign> = { comment: MessageCircle, dm: MessageSquare, mention: AtSign };
const FILTERS: { key: 'all' | TConvType; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'comment', label: 'Comments' }, { key: 'dm', label: 'Messages' }, { key: 'mention', label: 'Mentions' },
];
// Deterministic mock contact stats.
const followersFor = (name: string) => 1200 + (name.length * 731) % 48000;
const pastFor = (name: string) => 1 + (name.length % 6);

export default function Inbox() {
  const [convos, setConvos] = useState<IConversation[]>(CONVERSATIONS);
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [filter, setFilter] = useState<'all' | TConvType>('all');
  const [draft, setDraft] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const list = convos.filter((c) => filter === 'all' || c.type === filter);
  const active = convos.find((c) => c.id === activeId);

  const open = (id: string) => { setActiveId(id); setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: false } : c))); };
  const send = (text: string) => {
    const t = text.trim(); if (!t || !active) return;
    const msg: IInboxMsg = { from: 'us', text: t, time: 'now' };
    setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, messages: [...c.messages, msg] } : c)));
    setDraft('');
  };
  const assign = (who: string) => active && setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, assignee: who } : c)));

  return (
    <div className="flex min-h-[560px] flex-col gap-4 lg:h-[calc(100vh-7rem)]">
      <SectionTitle title="Inbox" subtitle="Comments, messages and mentions across all platforms — reply, assign and resolve." />

      {/* 3-pane workspace — stacks on mobile, fills height on desktop (panes scroll internally) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Conversation list */}
        <DemoCard className="flex max-h-[60vh] flex-col overflow-hidden p-0 lg:max-h-none lg:col-span-1">
          <div className="flex gap-1 border-b border-neutral-200 p-2">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn('flex-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors', filter === f.key ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100')}>{f.label}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {list.map((c) => {
              const TypeIcon = typeIcon[c.type];
              return (
                <button key={c.id} onClick={() => open(c.id)}
                  className={cn('flex w-full items-start gap-3 border-b border-neutral-100 p-3 text-left transition-colors', activeId === c.id ? 'bg-primary-100' : 'hover:bg-neutral-100/60')}>
                  <div className="relative">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">{c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                    <span className="absolute -bottom-1 -right-1"><PlatformChip platform={c.platform} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between"><span className="truncate text-sm font-medium text-text-dark">{c.name}</span><span className="shrink-0 text-[11px] text-neutral-400">{c.time}</span></div>
                    <p className="flex items-center gap-1 truncate text-xs text-neutral-500"><TypeIcon size={11} /> {c.messages[c.messages.length - 1].text}</p>
                  </div>
                  {c.unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-800" />}
                </button>
              );
            })}
          </div>
        </DemoCard>

        {/* Thread */}
        <DemoCard className="flex min-h-[70vh] flex-col overflow-hidden p-0 lg:min-h-0 lg:col-span-2">
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-neutral-200 p-3">
                <div className="flex items-center gap-2">
                  <PlatformChip platform={active.platform} size="md" />
                  <div><p className="text-sm font-semibold text-text-dark">{active.name}</p><p className="text-xs text-neutral-500">{active.handle} · {getPlatform(active.platform).name} {active.type}</p></div>
                </div>
                <button className="flex items-center gap-1 rounded-lg bg-warnings-successBg px-3 py-1.5 text-xs font-medium text-warnings-success"><CheckCircle2 size={13} /> Resolve</button>
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
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SAVED_REPLIES.map((r) => (
                    <button key={r} onClick={() => setDraft(r)} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:border-primary-300 hover:bg-primary-100">{r.length > 30 ? `${r.slice(0, 30)}…` : r}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(draft)} placeholder={`Reply to ${active.name}…`}
                    className="min-h-10 flex-1 rounded-lg px-3 py-2 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300" />
                  <button onClick={() => send(draft)} disabled={!draft.trim()} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-800 text-white transition-opacity disabled:opacity-50"><Send size={16} /></button>
                </div>
              </div>
            </>
          ) : <div className="flex flex-1 items-center justify-center text-sm text-neutral-500"><Check size={16} className="mr-2" /> All caught up.</div>}
        </DemoCard>

        {/* Contact details */}
        <DemoCard className="flex flex-col gap-4 overflow-y-auto lg:col-span-1">
          {active ? (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="relative">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-neutral-700">{active.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                  <span className="absolute bottom-0 right-0"><PlatformChip platform={active.platform} size="md" /></span>
                </span>
                <div><p className="font-Sora text-base font-semibold text-text-dark">{active.name}</p><p className="text-xs text-neutral-500">{active.handle}</p></div>
                <span className="rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium capitalize text-primary-900">{active.type} · {getPlatform(active.platform).name}</span>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">Assigned to</p>
                <div className="mt-1.5"><DsSelect value={active.assignee} onChange={assign} options={TEAM.map((t) => ({ value: t, label: t }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Star} label="Followers" value={formatFollowers(followersFor(active.name))} />
                <Stat icon={MessageCircle} label="Past chats" value={`${pastFor(active.name)}`} />
                <Stat icon={Clock} label="First seen" value="3 mo ago" />
                <Stat icon={InboxIcon} label="Sentiment" value="Positive" />
              </div>

              <div className="mt-auto flex flex-col gap-2">
                <button onClick={() => setProfileOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-primary-800 py-2 text-sm font-semibold text-white hover:bg-primary-900"><ExternalLink size={14} /> View profile</button>
                <button className="flex items-center justify-center gap-2 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"><StickyNote size={14} /> Add internal note</button>
              </div>
            </>
          ) : <p className="text-sm text-neutral-500">Select a conversation.</p>}
        </DemoCard>
      </div>

      {/* Profile modal */}
      <AnimatePresence>
        {profileOpen && active && (
          <Backdrop onClose={() => setProfileOpen(false)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-7">
              <div className="flex items-start justify-between">
                <SectionTitle title="Profile" subtitle={getPlatform(active.platform).name} />
                <button onClick={() => setProfileOpen(false)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="relative">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-neutral-700">{active.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                  <span className="absolute bottom-0 right-0"><PlatformChip platform={active.platform} size="md" /></span>
                </span>
                <div>
                  <p className="font-Sora text-lg font-semibold text-text-dark">{active.name}</p>
                  <p className="text-sm text-neutral-500">{active.handle}</p>
                  <span className="mt-1 inline-block rounded-full bg-warnings-successBg px-2 py-0.5 text-xs font-medium text-warnings-success">Engaged member</span>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700">Active member of the Eastern Province business community. Frequently engages with Chamber events, SME programmes and Vision 2030 content.</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Stat icon={Star} label="Followers" value={formatFollowers(followersFor(active.name))} />
                <Stat icon={MessageCircle} label="Past chats" value={`${pastFor(active.name)}`} />
                <Stat icon={Clock} label="Member" value="3 mo" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-neutral-500">Recent activity</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-700">
                  <li className="flex items-center gap-2"><MessageCircle size={13} className="text-primary-800" /> Commented on the Investment Forum post</li>
                  <li className="flex items-center gap-2"><Star size={13} className="text-primary-800" /> Liked 4 recent Chamber posts</li>
                  <li className="flex items-center gap-2"><AtSign size={13} className="text-primary-800" /> Mentioned @EP_Chamber last week</li>
                </ul>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setProfileOpen(false)} className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100">Close</button>
                <a href={`https://${getPlatform(active.platform).name.toLowerCase()}.com`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-800 py-2.5 text-sm font-semibold text-white hover:bg-primary-900"><ExternalLink size={15} /> Open on {getPlatform(active.platform).name}</a>
              </div>
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) => (
  <div className="rounded-lg border border-neutral-200 p-3">
    <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Icon size={12} /> {label}</p>
    <p className="mt-1 text-sm font-semibold text-text-dark">{value}</p>
  </div>
);
