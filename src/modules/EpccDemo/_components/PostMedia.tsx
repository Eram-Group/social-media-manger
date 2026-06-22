import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shadecn/lib/utils';
import { Images, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { IPost } from '../_data/posts';

// Renders a post's media — a video player (reels/videos), a single image, or a
// gallery grid. Images open a full-screen lightbox with prev/next + keyboard nav.
export default function PostMedia({ post, className }: { post: IPost; className?: string }) {
  const imgs = post.media ?? [];
  const [box, setBox] = useState<number | null>(null);
  const move = (d: number) => setBox((b) => (b === null ? b : (b + d + imgs.length) % imgs.length));

  useEffect(() => {
    if (box === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBox(null);
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [box, imgs.length]);

  let body = null;
  if (post.video) {
    body = <video controls playsInline preload="metadata" className={cn('w-full rounded-xl border border-neutral-200 bg-black object-contain', className)} style={{ maxHeight: 440, minHeight: 220 }} src={post.video} />;
  } else if (imgs.length === 1) {
    body = <img src={imgs[0]} alt="" onClick={() => setBox(0)} className={cn('w-full cursor-zoom-in rounded-xl border border-neutral-200 object-cover', className)} style={{ maxHeight: 440 }} />;
  } else if (imgs.length > 1) {
    body = (
      <div className={cn('relative', className)}>
        <div className="grid grid-cols-2 gap-2">
          {imgs.slice(0, 4).map((src, i) => (
            <button key={i} onClick={() => setBox(i)} className={cn('group relative overflow-hidden rounded-lg', imgs.length === 3 && i === 0 && 'col-span-2')}>
              <img src={src} alt="" className="h-40 w-full cursor-zoom-in object-cover transition-transform group-hover:scale-105 sm:h-44" />
              {i === 3 && imgs.length > 4 && <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-semibold text-white">+{imgs.length - 4}</div>}
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs font-medium text-white"><Images size={12} /> {imgs.length}</span>
      </div>
    );
  }

  return (
    <>
      {body}
      <AnimatePresence>
        {box !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setBox(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
            <button onClick={() => setBox(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X size={20} /></button>
            {imgs.length > 1 && <button onClick={(e) => { e.stopPropagation(); move(-1); }} className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft size={24} /></button>}
            <motion.img key={box} src={imgs[box]} alt="" onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" />
            {imgs.length > 1 && <button onClick={(e) => { e.stopPropagation(); move(1); }} className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight size={24} /></button>}
            {imgs.length > 1 && <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">{box + 1} / {imgs.length}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
