import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  Bell, Megaphone, FileText, X, Heart, MessageCircle, Share2, Eye, Trash2,
  CalendarDays, CalendarRange, ListOrdered, GripVertical, Plus,
} from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, PlatformChip, StatusPill, formatFollowers } from '../_components/ui';
import { Backdrop, DrawerPanel } from '../_components/motion';
import { usePosts } from '@/mock-server/posts-store';
import { IPost, TPostStatus, TPostType } from '@/mock-server/posts';

const TODAY = '2026-06-22';
const WEEK = [
  { date: '2026-06-22', label: 'Mon 22' }, { date: '2026-06-23', label: 'Tue 23' },
  { date: '2026-06-24', label: 'Wed 24' }, { date: '2026-06-25', label: 'Thu 25' },
  { date: '2026-06-26', label: 'Fri 26' }, { date: '2026-06-27', label: 'Sat 27' },
  { date: '2026-06-28', label: 'Sun 28' },
];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const pad = (n: number) => String(n).padStart(2, '0');
// June 2026 starts Monday → 30 days, then 5 trailing July days to fill the grid.
const MONTH_CELLS = [
  ...Array.from({ length: 30 }, (_, i) => ({ day: i + 1, date: `2026-06-${pad(i + 1)}`, outside: false })),
  ...Array.from({ length: 5 }, (_, i) => ({ day: i + 1, date: `2026-07-${pad(i + 1)}`, outside: true })),
];

const statusTone: Record<TPostStatus, 'success' | 'caution' | 'info'> = { published: 'success', scheduled: 'info', draft: 'caution' };
const statusColor: Record<TPostStatus, string> = { published: '#00A87E', scheduled: '#025FCC', draft: '#F0C500' };
const typeIcon: Record<TPostType, typeof Bell> = { reminder: Bell, campaign: Megaphone, post: FileText };
type TCalView = 'week' | 'month' | 'queue';
type TStatusFilter = 'all' | TPostStatus;

export default function CalendarView() {
  const navigate = useNavigate();
  const { posts, updatePost, deletePost } = usePosts();
  const createOn = (date: string) => navigate(`/epcc-demo/posts?create=1&date=${date}`);
  const [selected, setSelected] = useState<IPost | null>(null);
  const [view, setView] = useState<TCalView>('month');
  const [statusFilter, setStatusFilter] = useState<TStatusFilter>('all');
  const [overDate, setOverDate] = useState<string | null>(null);
  const draggedRef = useRef(false); // true while/just-after a drag, to suppress the click

  const visible = posts.filter((p) => statusFilter === 'all' || p.status === statusFilter);
  const drop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const p = posts.find((x) => x.id === id);
    if (p && p.date !== date) updatePost({ ...p, date });
    setOverDate(null);
  };

  const Chip = ({ post, compact }: { post: IPost; compact?: boolean }) => {
    const TypeIcon = typeIcon[post.type];
    return (
      <div draggable
        onDragStart={(e) => { draggedRef.current = true; e.dataTransfer.setData('text/plain', post.id); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { setOverDate(null); window.setTimeout(() => { draggedRef.current = false; }, 150); }}
        onClick={() => { if (draggedRef.current) { draggedRef.current = false; return; } setSelected(post); }}
        style={{ borderLeftColor: statusColor[post.status] }}
        className={cn('group cursor-grab select-none rounded-md border border-l-[3px] border-neutral-200 bg-white p-1.5 text-left shadow-6 transition-shadow hover:shadow-4 active:cursor-grabbing [&_*]:pointer-events-none')}>
        <div className="mb-0.5 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-500"><GripVertical size={10} className="opacity-0 group-hover:opacity-100" /><TypeIcon size={10} /> {post.time}</span>
          <div className="flex items-center gap-0.5">{post.platforms.slice(0, compact ? 2 : 3).map((pl) => <PlatformChip key={pl} platform={pl} />)}</div>
        </div>
        <p className={cn('text-[11px] leading-tight text-neutral-800', compact ? 'line-clamp-1' : 'line-clamp-2')}>{post.content}</p>
      </div>
    );
  };

  const Cell = ({ date, droppable = true, children, className }: { date: string; droppable?: boolean; children: React.ReactNode; className?: string }) => (
    <div
      onDragOver={droppable ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverDate((d) => (d === date ? d : date)); } : undefined}
      onDrop={droppable ? (e) => drop(e, date) : undefined}
      className={cn('rounded-lg border transition-colors', overDate === date && droppable ? 'border-primary-400 bg-primary-100' : 'border-neutral-200', className)}>
      {children}
    </div>
  );

  const upcoming = [...visible].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const STATUSES: { key: TStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'published', label: 'Published' }, { key: 'scheduled', label: 'Scheduled' }, { key: 'draft', label: 'Drafts' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Content Calendar" subtitle="June 2026 · drag a post to reschedule it" />
        <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 p-0.5">
          {([['week', CalendarDays], ['month', CalendarRange], ['queue', ListOrdered]] as const).map(([m, Icon]) => (
            <button key={m} onClick={() => setView(m)} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize transition-colors', view === m ? 'bg-primary-800 text-white' : 'text-neutral-600 hover:bg-neutral-100')}><Icon size={15} /> {m}</button>
          ))}
        </div>
      </div>

      {/* status filter */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => {
          const count = s.key === 'all' ? posts.length : posts.filter((p) => p.status === s.key).length;
          return (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', statusFilter === s.key ? 'border-primary-300 bg-secondary-200 font-medium text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
              {s.key !== 'all' && <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor[s.key as TPostStatus] }} />}
              {s.label}
              <span className={cn('rounded-full px-1.5 text-xs', statusFilter === s.key ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600')}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* WEEK */}
      {view === 'week' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {WEEK.map((d) => {
            const count = visible.filter((p) => p.date === d.date).length;
            return (
              <Cell key={d.date} date={d.date} className={cn('group flex min-h-[220px] flex-col gap-2 p-2', d.date === TODAY ? 'bg-primary-100/40' : 'bg-neutral-100/40')}>
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <p className={cn('text-sm font-semibold', d.date === TODAY ? 'text-primary-800' : 'text-text-dark')}>{d.label}{d.date === TODAY && ' · Today'}</p>
                  <div className="flex items-center gap-1">
                    {count > 0 && <span className="rounded-full bg-neutral-200 px-1.5 text-[10px] font-medium text-neutral-600">{count}</span>}
                    <button onClick={() => createOn(d.date)} title="New post" className="text-neutral-400 opacity-0 transition-opacity hover:text-primary-800 group-hover:opacity-100"><Plus size={14} /></button>
                  </div>
                </div>
                {visible.filter((p) => p.date === d.date).map((p) => <Chip key={p.id} post={p} />)}
              </Cell>
            );
          })}
        </div>
      )}

      {/* MONTH — real calendar grid */}
      {view === 'month' && (
        <DemoCard>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-Sora text-lg font-semibold text-text-dark">June 2026</p>
            <p className="text-xs text-neutral-500">{visible.length} item{visible.length === 1 ? '' : 's'}</p>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium text-neutral-500">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {MONTH_CELLS.map((c) => {
              const dayPosts = visible.filter((p) => p.date === c.date);
              const isToday = c.date === TODAY;
              return (
                <Cell key={c.date} date={c.date} droppable={!c.outside}
                  className={cn('group flex min-h-[116px] flex-col gap-1 p-1.5', c.outside ? 'bg-neutral-100/40 opacity-50' : isToday ? 'bg-primary-100/40 ring-1 ring-primary-300' : 'bg-white')}>
                  <div className="flex items-center justify-between">
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-primary-800 text-white' : c.outside ? 'text-neutral-400' : 'text-neutral-600')}>{c.day}</span>
                    <div className="flex items-center gap-1">
                      {dayPosts.length > 0 && <span className="rounded-full bg-neutral-200 px-1.5 text-[10px] font-medium text-neutral-600">{dayPosts.length}</span>}
                      {!c.outside && <button onClick={() => createOn(c.date)} title="New post" className="text-neutral-400 opacity-0 transition-opacity hover:text-primary-800 group-hover:opacity-100"><Plus size={13} /></button>}
                    </div>
                  </div>
                  {dayPosts.slice(0, 2).map((p) => <Chip key={p.id} post={p} compact />)}
                  {dayPosts.length > 2 && <span className="px-1 text-[10px] font-medium text-neutral-400">+{dayPosts.length - 2} more</span>}
                </Cell>
              );
            })}
          </div>
        </DemoCard>
      )}

      {/* QUEUE */}
      {view === 'queue' && (
        upcoming.length === 0
          ? <DemoCard className="py-10 text-center text-sm text-neutral-500">Nothing in the queue for this filter.</DemoCard>
          : <DemoCard className="flex flex-col divide-y divide-neutral-200 p-0">
            {upcoming.map((p) => (
              <button key={p.id} onClick={() => setSelected(p)} className="flex items-center gap-4 p-4 text-left hover:bg-neutral-100/60">
                <div className="w-20 shrink-0"><p className="text-sm font-semibold text-text-dark">{p.date.slice(8)} {p.date.startsWith('2026-07') ? 'Jul' : 'Jun'}</p><p className="text-xs text-neutral-500">{p.time}</p></div>
                <span className="h-8 w-1 rounded-full" style={{ background: statusColor[p.status] }} />
                <StatusPill tone={statusTone[p.status]}>{p.status}</StatusPill>
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{p.content}</p>
                <div className="flex items-center gap-1">{p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}</div>
              </button>
            ))}
          </DemoCard>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <Backdrop onClose={() => setSelected(null)}>
            <DrawerPanel className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-7">
              <div className="flex items-start justify-between">
                <SectionTitle title={selected.type === 'reminder' ? 'Reminder' : 'Post details'} subtitle={`${selected.date} · ${selected.time}`} />
                <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
              </div>
              <div className="mt-4 flex items-center gap-2"><StatusPill tone={statusTone[selected.status]}>{selected.status}</StatusPill>{selected.campaign && <StatusPill tone="info">▣ {selected.campaign}</StatusPill>}</div>
              <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-800">{selected.content}</p>
              {selected.platforms.length > 0 && (
                <div className="mt-4"><p className="text-xs font-medium uppercase text-neutral-500">Platforms</p>
                  <div className="mt-2 flex flex-wrap gap-2">{selected.platforms.map((p) => <span key={p} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-1 text-sm"><PlatformChip platform={p} /> {p}</span>)}</div>
                </div>
              )}
              {selected.status === 'published' && (
                <div className="mt-5"><p className="text-xs font-medium uppercase text-neutral-500">Performance</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <Stat icon={Eye} label="Reach" value={formatFollowers(selected.reach ?? 0)} />
                    <Stat icon={Heart} label="Likes" value={formatFollowers(selected.likes ?? 0)} />
                    <Stat icon={MessageCircle} label="Comments" value={`${selected.comments ?? 0}`} />
                    <Stat icon={Share2} label="Shares" value={`${selected.shares ?? 0}`} />
                  </div>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button onClick={() => navigate(`/epcc-demo/posts/${selected.id}`)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-800 py-2.5 text-sm font-semibold text-white hover:bg-primary-900"><Eye size={15} /> Open post details</button>
                <button onClick={() => { deletePost(selected.id); setSelected(null); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-text-red/5 py-2.5 text-sm font-medium text-text-red hover:bg-text-red/10"><Trash2 size={15} /> Delete</button>
              </div>
            </DrawerPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) => (
  <div className="rounded-lg border border-neutral-200 p-3">
    <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Icon size={13} /> {label}</p>
    <p className="mt-1 font-Sora text-lg font-semibold text-text-dark">{value}</p>
  </div>
);
