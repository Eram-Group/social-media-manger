'use client';

import { ReactNode, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Plus, Pencil, Trash2, AlertTriangle, Megaphone, List, Table2, LayoutGrid, Check, CalendarClock, XCircle, Search, Inbox, Heart } from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, StatCard, StatusPill, PlatformChip, formatFollowers, ListRowSkeleton } from '../_components/ui';
import { Backdrop, ModalPanel, Stagger, StaggerItem } from '../_components/motion';
import PostSheet from '../_components/PostSheet';
import PostThumb from '../_components/PostThumb';
import Composer from './Composer';
import { usePosts } from '@/mock-server/posts-store';
import { IPost, getPostAnalytics, TPostStatus } from '@/mock-server/posts';
import { PLATFORMS, TPlatformId, getPlatform } from '@/mock-server/platforms';
import { EPCC_ROUTES } from '../routes';
import { publishPost, outcomesToRefs } from '../_services/publish';

const tone: Record<TPostStatus, 'success' | 'info' | 'caution'> = {
  published: 'success', scheduled: 'info', draft: 'caution',
};

// A small badge for the post type (post / reel / story / video).
const FMT_STYLE: Record<string, string> = {
  reel: 'bg-[#FCE7F3] text-[#DB2777]',
  story: 'bg-[#EDE9FE] text-[#7C3AED]',
  video: 'bg-[#E0ECFF] text-[#2563EB]',
  post: 'bg-neutral-100 text-neutral-600',
};
const FormatBadge = ({ format }: { format?: string }) => {
  const f = format ?? 'post';
  return <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', FMT_STYLE[f] ?? FMT_STYLE.post)}>{f}</span>;
};

type TStatusFilter = 'all' | TPostStatus;
type TViewMode = 'list' | 'table' | 'grid';
type TView = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; post: IPost };

export default function PostsAnalytics() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { posts, loading, addPost, updatePost, deletePost, refresh } = usePosts();
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<TView>(params.get('create') ? { mode: 'create' } : { mode: 'list' });
  const [viewMode, setViewMode] = useState<TViewMode>('table');
  const [open, setOpen] = useState<IPost | null>(null);
  const [confirm, setConfirm] = useState<IPost | null>(null);
  const [toast, setToast] = useState('');
  const [status, setStatus] = useState<TStatusFilter>('all');
  const [platform, setPlatform] = useState<'all' | TPlatformId>('all');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<string[]>([]);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2500); };
  const toggleSel = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const clearSel = () => setSel([]);
  const promote = (p: IPost) => router.push(`${EPCC_ROUTES.PROMOTION}?post=${p.id}`);

  // ---- compose (create / edit) ----
  if (view.mode !== 'list') {
    const done = () => { setView({ mode: 'list' }); if (params.get('create') || params.get('date')) router.replace(pathname); };
    return (
      <Composer
        initial={view.mode === 'edit' ? view.post : undefined}
        initialDate={view.mode === 'create' ? params.get('date') ?? undefined : undefined}
        onCancel={done}
        onSave={async (post, action) => {
          let finalPost = post;
          let message = action === 'publish' ? 'Post published ✓' : action === 'schedule' ? 'Post scheduled ✓' : 'Draft saved ✓';

          // Both publish and schedule hit the real platform; schedule passes a future time.
          if (action === 'publish' || action === 'schedule') {
            const schedTs = action === 'schedule'
              ? Math.floor(new Date(`${post.date}T${post.time}:00`).getTime() / 1000)
              : undefined;
            const verb = action === 'schedule' ? 'Scheduled' : 'Published';
            const outcomes = await publishPost(post, schedTs);
            if (outcomes.length) {
              const ok = outcomes.filter((o) => o.ok);
              const failed = outcomes.filter((o) => !o.ok);
              finalPost = { ...post, remoteRefs: outcomesToRefs(outcomes) };
              if (ok.length && !failed.length) {
                message = `${verb} on ${ok.map((o) => getPlatform(o.platform).name).join(', ')} ✓`;
              } else if (ok.length && failed.length) {
                message = `${verb} on ${ok.map((o) => getPlatform(o.platform).name).join(', ')}; ${failed.map((o) => `${getPlatform(o.platform).name}: ${o.error}`).join(', ')}`;
              } else {
                // Nothing published — keep it as a draft instead of a phantom
                // "published" post, and surface the real reason.
                message = `Couldn’t ${verb.toLowerCase()} — ${failed.map((o) => `${getPlatform(o.platform).name}: ${o.error}`).join(', ')}`;
                finalPost = { ...post, status: 'draft', remoteRefs: undefined };
              }
            }
          }

          if (view.mode === 'edit') updatePost(finalPost); else addPost(finalPost);
          done();
          flash(message);
          // Reconcile published posts with the platform shortly after.
          if (action === 'publish' && finalPost.remoteRefs?.length) {
            window.setTimeout(() => refresh(), 1500);
          }
        }}
      />
    );
  }

  const filtered = posts.filter(
    (p) =>
      (status === 'all' || p.status === status) &&
      (platform === 'all' || p.platforms.includes(platform)) &&
      (search.trim() === '' || p.content.toLowerCase().includes(search.toLowerCase())),
  );
  const published = posts.filter((p) => p.status === 'published');
  const totalEngagement = published.reduce((s, p) => s + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0), 0);
  const totalComments = published.reduce((s, p) => s + (p.comments ?? 0), 0);

  const STATUSES: { key: TStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'published', label: 'Published' }, { key: 'scheduled', label: 'Scheduled' }, { key: 'draft', label: 'Drafts' },
  ];
  const countOf = (k: TStatusFilter) => (k === 'all' ? posts.length : posts.filter((p) => p.status === k).length);

  // bulk selection
  const allSelected = filtered.length > 0 && filtered.every((p) => sel.includes(p.id));
  const toggleAll = () => setSel(allSelected ? [] : filtered.map((p) => p.id));
  const bulkDelete = async () => {
    const ids = [...sel];
    clearSel();
    const results = await Promise.all(ids.map((id) => deletePost(id)));
    const failed = results.filter((r) => !r.ok).length;
    const hidden = results.filter((r) => r.ok && r.hiddenOnly).length;
    const deleted = results.filter((r) => r.ok && !r.hiddenOnly).length;
    const parts = [];
    if (deleted) parts.push(`${deleted} deleted`);
    if (hidden) parts.push(`${hidden} removed from dashboard (still on Instagram)`);
    if (failed) parts.push(`${failed} failed`);
    flash(parts.join(' · ') || 'Done');
  };
  const bulkSchedule = () => { posts.filter((p) => sel.includes(p.id)).forEach((p) => updatePost({ ...p, status: 'scheduled' })); flash(`${sel.length} scheduled`); clearSel(); };

  const SelBox = ({ id }: { id: string }) => (
    <button onClick={() => toggleSel(id)} title="Select"
      className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
        sel.includes(id) ? 'border-primary-800 bg-primary-800 text-white' : 'border-neutral-300 hover:border-primary-400')}>
      {sel.includes(id) && <Check size={12} />}
    </button>
  );

  // Shared CRUD actions (published = delete-only; drafts/scheduled = edit; non-draft = promote).
  const Actions = ({ p }: { p: IPost }) => (
    <div className="flex items-center gap-1">
      {p.status !== 'published' && (
        <IconBtn title="Edit" onClick={() => setView({ mode: 'edit', post: p })} hover="hover:text-primary-800"><Pencil size={15} /></IconBtn>
      )}
      {p.status !== 'draft' && (
        <IconBtn title="Promote" onClick={() => promote(p)} hover="hover:text-primary-800"><Megaphone size={15} /></IconBtn>
      )}
      <IconBtn title="Delete" onClick={() => setConfirm(p)} hover="hover:bg-text-red/10 hover:text-text-red"><Trash2 size={15} /></IconBtn>
    </div>
  );

  // Facebook no longer exposes reach via the API, so we show real engagement
  // (likes + comments + shares) for published posts instead.
  const engOf = (p: IPost) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
  const reachCell = (p: IPost) => {
    if (p.status === 'published') {
      return <span className="flex items-center gap-1 text-neutral-700"><Heart size={14} /> {engOf(p).toLocaleString()}</span>;
    }
    return <span className={cn('text-xs font-medium', p.status === 'scheduled' ? 'text-primary-800' : 'text-warnings-caution')}>{p.status === 'scheduled' ? `Scheduled · ${p.time}` : 'Draft'}</span>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <SectionTitle title="Posts" subtitle="Create, schedule, edit, publish, promote and analyse — all in one place." />
        <div className="w-40">
          <Button variant="primary" size="medium" leftIcon={<Plus size={16} />} onClick={() => setView({ mode: 'create' })}>New post</Button>
        </div>
      </div>

      {toast && <div className="rounded-lg bg-warnings-successBg p-3 text-sm font-medium text-warnings-success">{toast}</div>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total posts" value={`${posts.length}`} />
        <StatCard label="Published" value={`${published.length}`} />
        <StatCard label="Total engagement" value={totalEngagement.toLocaleString()} />
        <StatCard label="Comments" value={totalComments.toLocaleString()} />
      </div>

      {/* Search */}
      {posts.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…"
            className="min-h-10 w-full rounded-lg bg-white py-2 pl-9 pr-3 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300" />
        </div>
      )}

      {/* Filters + view toggle */}
      {posts.length > 0 && (
      <DemoCard className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button key={s.key} onClick={() => setStatus(s.key)}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', status === s.key ? 'border-primary-300 bg-secondary-200 font-medium text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
              {s.label}
              <span className={cn('rounded-full px-1.5 text-xs', status === s.key ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600')}>{countOf(s.key)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setPlatform('all')} className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', platform === 'all' ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100')}>All</button>
            {PLATFORMS.map((p) => (
              <button key={p.id} onClick={() => setPlatform(p.id)} title={p.name}
                className={cn('flex h-7 w-7 items-center justify-center rounded-full border transition-all', platform === p.id ? 'border-primary-400 ring-2 ring-primary-200' : 'border-neutral-200 opacity-70 hover:opacity-100')}>
                <PlatformChip platform={p.id} />
              </button>
            ))}
          </div>
          {/* view toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 p-0.5">
            {([['list', List], ['table', Table2], ['grid', LayoutGrid]] as const).map(([m, Icon]) => (
              <button key={m} onClick={() => setViewMode(m)} title={`${m} view`}
                className={cn('flex h-7 w-7 items-center justify-center rounded-md transition-colors', viewMode === m ? 'bg-primary-800 text-white' : 'text-neutral-500 hover:bg-neutral-100')}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </DemoCard>
      )}

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-100 p-3 shadow-4">
            <span className="text-sm font-semibold text-primary-900">{sel.length} selected</span>
            <button onClick={toggleAll} className="text-xs font-medium text-primary-800 hover:underline">{allSelected ? 'Clear all' : 'Select all'}</button>
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={bulkSchedule} className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"><CalendarClock size={15} /> Schedule</button>
              <button onClick={bulkDelete} className="flex items-center gap-1.5 rounded-lg bg-text-red/5 px-3 py-1.5 text-sm font-medium text-text-red hover:bg-text-red/10"><Trash2 size={15} /> Delete</button>
              <button onClick={clearSel} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-white"><XCircle size={15} /> Clear</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && posts.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        posts.length === 0 ? (
          <DemoCard className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-800"><Inbox size={26} /></span>
            <div>
              <p className="font-Sora text-lg font-semibold text-text-dark">No posts yet</p>
              <p className="text-sm text-neutral-500">Create your first post, or refresh to pull posts from your connected accounts.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-40"><Button variant="primary" size="medium" leftIcon={<Plus size={16} />} onClick={() => setView({ mode: 'create' })}>New post</Button></div>
              <div className="w-44"><Button variant="outline" size="medium" onClick={() => { refresh(); flash('Refreshed from your accounts'); }}>Refresh posts</Button></div>
            </div>
          </DemoCard>
        ) : (
          <DemoCard className="py-10 text-center text-sm text-neutral-500">No posts match these filters.</DemoCard>
        )
      ) : null}

      {/* LIST view */}
      {viewMode === 'list' && filtered.length > 0 && (
        <Stagger className="flex flex-col gap-3">
          {filtered.map((p) => (
            <StaggerItem key={p.id}>
              <DemoCard className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', sel.includes(p.id) && 'ring-2 ring-primary-200')}>
                <SelBox id={p.id} />
                <PostThumb post={p} className="h-11 w-11" />
                <button className="flex min-w-0 flex-1 flex-col text-left" onClick={() => setOpen(p)}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusPill tone={tone[p.status]}>{p.status}</StatusPill>
                    <FormatBadge format={p.format} />
                    {p.campaign && <span className="text-xs font-medium text-primary-800">▣ {p.campaign}</span>}
                    <span className="text-xs text-neutral-500">{p.date} · {p.time}</span>
                  </div>
                  <p className="truncate text-sm text-neutral-800">{p.content}</p>
                </button>
                <div className="flex items-center gap-1">{p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}{p.platforms.length === 0 && <span className="text-xs text-neutral-400">—</span>}</div>
                <div className="flex w-32 items-center text-sm">{reachCell(p)}</div>
                <Actions p={p} />
              </DemoCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* TABLE view */}
      {viewMode === 'table' && filtered.length > 0 && (
        <DemoCard className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
                <th className="px-5 py-3"><button onClick={toggleAll} title="Select all"
                  className={cn('flex h-5 w-5 items-center justify-center rounded border', allSelected ? 'border-primary-800 bg-primary-800 text-white' : 'border-neutral-300')}>{allSelected && <Check size={12} />}</button></th>
                <th className="px-5 py-3 font-medium">Post</th><th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Platforms</th><th className="px-5 py-3 font-medium">Schedule</th>
                <th className="px-5 py-3 font-medium">Engagement</th><th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filtered.map((p) => (
                <tr key={p.id} className={cn('hover:bg-neutral-100/60', sel.includes(p.id) && 'bg-primary-100/50')}>
                  <td className="px-5 py-3"><SelBox id={p.id} /></td>
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><PostThumb post={p} className="h-9 w-9" /><button onClick={() => setOpen(p)} className="max-w-xs truncate text-left text-neutral-800 hover:text-primary-800">{p.content}</button></div></td>
                  <td className="px-5 py-3"><div className="flex items-center gap-1.5"><StatusPill tone={tone[p.status]}>{p.status}</StatusPill><FormatBadge format={p.format} /></div></td>
                  <td className="px-5 py-3"><div className="flex gap-1">{p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}</div></td>
                  <td className="px-5 py-3 text-neutral-600">{p.date} · {p.time}</td>
                  <td className="px-5 py-3">{reachCell(p)}</td>
                  <td className="px-5 py-3"><div className="flex justify-end"><Actions p={p} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </DemoCard>
      )}

      {/* GRID view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <StaggerItem key={p.id}>
              <DemoCard className={cn('flex h-full flex-col gap-3', sel.includes(p.id) && 'ring-2 ring-primary-200')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><SelBox id={p.id} /><StatusPill tone={tone[p.status]}>{p.status}</StatusPill><FormatBadge format={p.format} /></div>
                  <span className="text-xs text-neutral-500">{p.date} · {p.time}</span>
                </div>
                <button onClick={() => setOpen(p)} className="flex flex-1 items-start gap-3 text-left">
                  <PostThumb post={p} className="h-12 w-12" />
                  <p className="line-clamp-3 text-sm text-neutral-800">{p.content}</p>
                </button>
                <div className="flex items-center gap-1">{p.platforms.map((pl) => <PlatformChip key={pl} platform={pl} />)}{p.platforms.length === 0 && <span className="text-xs text-neutral-400">—</span>}</div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                  <div className="text-sm">{reachCell(p)}</div>
                  <Actions p={p} />
                </div>
              </DemoCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <PostSheet post={open} onClose={() => setOpen(null)} onEdit={(p) => setView({ mode: 'edit', post: p })} />

      {/* Delete confirm */}
      <AnimatePresence>
        {confirm && (
          <Backdrop onClose={() => setConfirm(null)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-text-red/10 text-text-red"><AlertTriangle size={20} /></span>
                <SectionTitle title="Delete this post?" subtitle={confirm.status === 'published' ? 'It will be removed from all platforms.' : 'This action cannot be undone.'} />
              </div>
              <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700">{confirm.content}</p>
              <div className="mt-5 flex justify-end gap-3">
                <div className="w-28"><Button variant="outline" size="medium" onClick={() => setConfirm(null)}>Cancel</Button></div>
                <div className="w-36"><Button variant="destructive" size="medium" loading={deleting} disable={deleting} onClick={async () => { const p = confirm; setDeleting(true); const r = await deletePost(p.id); setDeleting(false); setConfirm(null); flash(!r.ok ? (r.errors[0] || 'Delete failed') : r.hiddenOnly ? 'Removed from dashboard (still live on Instagram)' : 'Post deleted ✓'); }}>Delete</Button></div>
              </div>
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

const IconBtn = ({ title, onClick, hover, children }: { title: string; onClick: () => void; hover: string; children: ReactNode }) => (
  <button onClick={onClick} title={title} className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100', hover)}>
    {children}
  </button>
);
