import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Heart, MessageCircle, Share2, X, ArrowRight, Pencil, Megaphone, Trash2, CalendarClock, Layers } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, StatusPill, PlatformChip, formatFollowers } from './ui';
import { Backdrop, DrawerPanel } from './motion';
import { usePosts } from '../_data/posts-store';
import { IPost, getPostAnalytics, TPostStatus } from '../_data/posts';
import { getPlatform } from '../_data/platforms';
import PostMedia from './PostMedia';
import { EPCC_ROUTES } from '../routes';

const tone: Record<TPostStatus, 'success' | 'info' | 'caution'> = { published: 'success', scheduled: 'info', draft: 'caution' };

// Quick post sheet — rich details + Edit / Promote / Delete actions and a link to
// the full analytics page. `onEdit` is optional (only the Posts workspace can edit).
export default function PostSheet({ post, onClose, onEdit }: { post: IPost | null; onClose: () => void; onEdit?: (p: IPost) => void }) {
  const navigate = useNavigate();
  const { deletePost } = usePosts();
  const [confirmDel, setConfirmDel] = useState(false);
  const a = post ? getPostAnalytics(post) : null;
  const close = () => { setConfirmDel(false); onClose(); };

  return (
    <AnimatePresence>
      {post && a && (
        <Backdrop onClose={close}>
          <DrawerPanel className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-7">
            <div className="flex items-start justify-between p-6 pb-3">
              <SectionTitle title="Post details" subtitle={`${post.date} · ${post.time}`} />
              <button onClick={close} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={tone[post.status]}>{post.status}</StatusPill>
                {post.format && <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium capitalize text-neutral-600"><Layers size={11} /> {post.format}</span>}
                {post.campaign && <StatusPill tone="info">▣ {post.campaign}</StatusPill>}
              </div>

              <p className="whitespace-pre-line rounded-lg bg-neutral-100 p-3 text-sm text-neutral-800">{post.content}</p>
              {(post.video || post.media?.length) && <div className="mt-3"><PostMedia post={post} /></div>}

              {/* meta grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Meta icon={CalendarClock} label="Scheduled" value={`${post.date.slice(8)} Jun · ${post.time}`} />
                <Meta icon={Layers} label="Format" value={post.format ?? 'post'} />
              </div>

              {/* platforms */}
              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">Platforms ({post.platforms.length})</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.platforms.length ? post.platforms.map((pl) => (
                    <span key={pl} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-2 py-1 text-xs">
                      <PlatformChip platform={pl} /> {getPlatform(pl).name}
                    </span>
                  )) : <span className="text-sm text-neutral-400">—</span>}
                </div>
              </div>

              {/* performance OR publishing summary */}
              {a.published ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Mini icon={Eye} label="Reach" value={formatFollowers(a.reach)} />
                    <Mini icon={Heart} label="Likes" value={formatFollowers(a.likes)} />
                    <Mini icon={Share2} label="Eng." value={`${a.engagementRate}%`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-neutral-500">Reach by platform</p>
                    <div className="mt-2 flex flex-col divide-y divide-neutral-100">
                      {a.perPlatform.map((pp) => (
                        <div key={pp.platform} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="flex items-center gap-2 text-neutral-700"><PlatformChip platform={pp.platform} /> {getPlatform(pp.platform).name}</span>
                          <span className="text-neutral-600">{formatFollowers(pp.reach)} · {pp.engagement}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to={`/epcc-demo/posts/${post.id}`} onClick={close}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary-800 py-3 text-sm font-semibold text-white hover:bg-primary-900">
                    Open full analytics <ArrowRight size={16} />
                  </Link>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-100 p-4 text-sm text-neutral-600">
                  <p className="font-medium text-neutral-800">{post.status === 'scheduled' ? 'Ready to publish' : 'Draft'}</p>
                  <p className="mt-1 flex items-center gap-1.5"><MessageCircle size={13} /> {post.status === 'scheduled' ? `Will publish on ${post.date.slice(8)} Jun at ${post.time} to ${post.platforms.length} platform${post.platforms.length === 1 ? '' : 's'}.` : 'Not scheduled yet — finish and schedule it to go live.'}</p>
                </div>
              )}
            </div>

            {/* actions */}
            <div className="border-t border-neutral-200 p-4">
              {confirmDel ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-text-red">Delete{post.status === 'published' ? ' from all platforms' : ''}?</span>
                  <button onClick={() => setConfirmDel(false)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Cancel</button>
                  <button onClick={() => { deletePost(post.id); close(); }} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Confirm delete</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {onEdit && post.status !== 'published' && (
                    <button onClick={() => { onEdit(post); close(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100"><Pencil size={15} /> Edit</button>
                  )}
                  {post.status !== 'draft' && (
                    <button onClick={() => { navigate(`${EPCC_ROUTES.PROMOTION}?post=${post.id}`); close(); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary-200 py-2.5 text-sm font-medium text-primary-900 hover:shadow-1"><Megaphone size={15} /> Promote</button>
                  )}
                  <button onClick={() => setConfirmDel(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-text-red/5 py-2.5 text-sm font-medium text-text-red hover:bg-text-red/10"><Trash2 size={15} /> Delete</button>
                </div>
              )}
            </div>
          </DrawerPanel>
        </Backdrop>
      )}
    </AnimatePresence>
  );
}

const Mini = ({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) => (
  <DemoCard className="p-3 text-center">
    <Icon size={15} className="mx-auto text-primary-800" />
    <p className="mt-1 font-Sora text-base font-semibold text-text-dark">{value}</p>
    <p className="text-xs text-neutral-500">{label}</p>
  </DemoCard>
);

const Meta = ({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) => (
  <div className="rounded-lg border border-neutral-200 p-2.5">
    <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Icon size={12} /> {label}</p>
    <p className="mt-0.5 text-sm font-medium capitalize text-text-dark">{value}</p>
  </div>
);
