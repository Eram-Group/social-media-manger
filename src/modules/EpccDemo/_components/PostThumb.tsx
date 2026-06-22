import { cn } from '@/shadecn/lib/utils';
import { Play, Images, FileText } from 'lucide-react';
import { IPost } from '../_data/posts';

// Small square media thumbnail for post rows/cards: video → play badge,
// image(s) → first image with a count, text-only → a document icon.
export default function PostThumb({ post, className }: { post: IPost; className?: string }) {
  const base = cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200', className);

  if (post.video) {
    return (
      <div className={cn(base, 'bg-neutral-900')}>
        {post.media?.[0] && <img src={post.media[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <Play size={16} className="relative text-white" fill="currentColor" />
      </div>
    );
  }
  const imgs = post.media ?? [];
  if (imgs.length) {
    return (
      <div className={cn(base, 'bg-neutral-100')}>
        <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
        {imgs.length > 1 && <span className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[9px] font-medium text-white"><Images size={8} /> {imgs.length}</span>}
      </div>
    );
  }
  return <div className={cn(base, 'bg-neutral-100')}><FileText size={15} className="text-neutral-400" /></div>;
}
