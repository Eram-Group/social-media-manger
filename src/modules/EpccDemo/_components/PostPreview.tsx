import { ReactNode } from 'react';
import {
  Heart, MessageCircle, Repeat2, Bookmark, Send, Eye, ThumbsUp, Share2, Music2, Plus,
} from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { getPlatform, INSTAGRAM_GRADIENT, TPlatformId } from '../_data/platforms';
import { FORMAT_SUPPORT, TPostFormat } from '../_data/posts';

interface Props {
  platform: TPlatformId;
  handle: string;
  name: string;
  content: string;
  image?: string;
  images?: string[];
  isVideo?: boolean;
  format?: TPostFormat;
}

const AVATAR = 'EP';
const placeholderText = <span className="text-neutral-400">Your post preview will appear here…</span>;

export default function PostPreview({ platform, handle, name, content, image, images, isVideo, format = 'post' }: Props) {
  const p = getPlatform(platform);
  const Brand = p.Icon;
  const body = content.trim();
  const supported = FORMAT_SUPPORT[format].includes(platform);
  const effective: TPostFormat = (format === 'reel' || format === 'story') && !supported ? 'post' : format;

  // Snapchat is story-native; TikTok is reel-native.
  const asStory = effective === 'story' || platform === 'snapchat';
  const asReel = !asStory && (effective === 'reel' || platform === 'tiktok');

  // Full image set (gallery). When >1, previews show a real carousel/grid.
  const imgs = images && images.length ? images : (image && !isVideo ? [image] : []);
  const multi = !isVideo && imgs.length > 1;

  const media = (cls: string, controls = false) =>
    !image && !imgs.length ? null : isVideo
      ? <video src={image} className={cls} muted loop autoPlay playsInline controls={controls} />
      : <img src={imgs[0] ?? image} alt="" className={cls} />;

  // Instagram-style swipe carousel: first image + page badge + dots.
  const galleryCarousel = () => (
    <div className="relative h-full w-full">
      <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">1/{imgs.length}</span>
      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
        {imgs.slice(0, 5).map((_, i) => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === 0 ? 'bg-white' : 'bg-white/50')} />)}
      </div>
    </div>
  );

  // X/LinkedIn/Facebook multi-photo grid (up to 4, +N overlay).
  const galleryGrid = (cls = '') => (
    <div className={cn('grid grid-cols-2 gap-0.5 overflow-hidden', cls)}>
      {imgs.slice(0, 4).map((src, i) => (
        <div key={i} className={cn('relative overflow-hidden', imgs.length === 3 && i === 0 && 'col-span-2')}>
          <img src={src} alt="" className="h-28 w-full object-cover" />
          {i === 3 && imgs.length > 4 && <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-semibold text-white">+{imgs.length - 4}</div>}
        </div>
      ))}
    </div>
  );

  const BrandBadge = () => (
    <span className="flex h-5 w-5 items-center justify-center rounded-full"
      style={{ background: platform === 'instagram' ? INSTAGRAM_GRADIENT : p.color, color: p.textOnBrand }}>
      <Brand size={11} />
    </span>
  );

  const Shell = ({ children, tag }: { children: ReactNode; tag?: string }) => (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-7">
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-medium text-neutral-600"><BrandBadge /> {p.name}</span>
        {tag && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">{tag}</span>}
      </div>
      {children}
    </div>
  );

  // ---------- STORY (vertical, ephemeral) ----------
  if (asStory) {
    return (
      <Shell tag="Story">
        <div className="relative flex aspect-[9/14] max-h-80 w-full items-center justify-center overflow-hidden bg-neutral-900">
          {image ? media('h-full w-full object-cover') : <Brand size={56} style={{ color: platform === 'snapchat' ? p.color : '#fff' }} />}
          {/* progress bars */}
          <div className="absolute inset-x-2 top-2 flex gap-1">
            {[0, 1, 2].map((i) => <span key={i} className={cn('h-0.5 flex-1 rounded-full', i === 0 ? 'bg-white' : 'bg-white/40')} />)}
          </div>
          <div className="absolute left-2 top-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-800 text-[10px] font-bold text-white">{AVATAR}</span>
            <span className="text-xs font-semibold text-white drop-shadow">{handle}</span>
          </div>
          {body && <p className="absolute inset-x-3 bottom-6 rounded bg-black/45 p-2 text-center text-sm text-white">{body}</p>}
        </div>
      </Shell>
    );
  }

  // ---------- REEL (vertical video) ----------
  if (asReel) {
    return (
      <Shell tag="Reel">
        <div className="relative flex aspect-[9/14] max-h-80 w-full items-center justify-center overflow-hidden bg-black">
          {image ? media('h-full w-full object-cover opacity-90') : <Brand size={56} className="text-white/80" />}
          <div className="absolute bottom-3 left-3 right-12 text-white">
            <p className="text-sm font-semibold">{handle}</p>
            <p className="mt-1 line-clamp-2 text-xs">{body || 'Your caption…'}</p>
            <p className="mt-1 flex items-center gap-1 text-xs"><Music2 size={12} /> original sound – EP Chamber</p>
          </div>
          <div className="absolute bottom-4 right-2 flex flex-col items-center gap-3 text-white">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary-800 text-[10px] font-bold">
              {AVATAR}<span className="absolute -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FE2C55] text-[10px]"><Plus size={10} /></span>
            </span>
            <Rail icon={Heart} value="18.4K" /><Rail icon={MessageCircle} value="402" /><Rail icon={Share2} value="1.2K" />
          </div>
        </div>
      </Shell>
    );
  }

  const fallbackTag = (format === 'reel' || format === 'story') && !supported ? `${format} → feed` : undefined;

  // ---------- FEED (post / video) ----------
  if (platform === 'x') {
    return (
      <Shell tag={fallbackTag}>
        <div className="flex gap-3 p-3">
          <Avatar />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm"><span className="font-bold text-neutral-1100">{name}</span><span className="text-neutral-500">{handle} · now</span></div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900">{body || placeholderText}</p>
            {multi ? <div className="mt-2 overflow-hidden rounded-2xl border border-neutral-200">{galleryGrid()}</div> : image && media('mt-2 max-h-56 w-full rounded-2xl border border-neutral-200 object-cover')}
            <div className="mt-3 flex max-w-xs items-center justify-between text-neutral-500">
              <Action icon={MessageCircle} value="24" /><Action icon={Repeat2} value="58" /><Action icon={Heart} value="312" /><Action icon={Eye} value="9.2K" />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (platform === 'instagram') {
    return (
      <Shell tag={fallbackTag}>
        <div className="flex items-center gap-2 p-3"><Avatar ring /><span className="text-sm font-semibold text-neutral-1100">{handle}</span><span className="ml-auto text-neutral-400">•••</span></div>
        <div className="flex aspect-square w-full items-center justify-center bg-neutral-100">{multi ? galleryCarousel() : image ? media('h-full w-full object-cover') : <Brand size={48} className="text-neutral-300" />}</div>
        <div className="flex items-center gap-4 p-3 text-neutral-900"><Heart size={22} /><MessageCircle size={22} /><Send size={22} /><Bookmark size={22} className="ml-auto" /></div>
        <div className="px-3 pb-3 text-sm"><p className="font-semibold text-neutral-1100">2,148 likes</p><p className="mt-1 text-neutral-900"><span className="font-semibold">{handle}</span> {body || placeholderText}</p></div>
      </Shell>
    );
  }

  if (platform === 'linkedin') {
    return (
      <Shell tag={fallbackTag}>
        <div className="flex gap-2 p-3"><Avatar /><div><p className="text-sm font-semibold text-neutral-1100">{name}</p><p className="text-xs text-neutral-500">Chamber of Commerce · Now · 🌐</p></div></div>
        <p className="px-3 pb-2 text-sm text-neutral-900">{body || placeholderText}</p>
        {multi ? galleryGrid() : image && media('max-h-60 w-full object-cover')}
        <div className="m-3 flex items-center justify-between border-t border-neutral-200 pt-2 text-xs font-medium text-neutral-600"><Action icon={ThumbsUp} value="Like" /><Action icon={MessageCircle} value="Comment" /><Action icon={Repeat2} value="Repost" /><Action icon={Send} value="Send" /></div>
      </Shell>
    );
  }

  // facebook (default feed)
  return (
    <Shell tag={fallbackTag}>
      <div className="flex gap-2 p-3"><Avatar /><div><p className="text-sm font-semibold text-neutral-1100">{name}</p><p className="text-xs text-neutral-500">Just now · 🌐</p></div></div>
      <p className="px-3 pb-2 text-sm text-neutral-900">{body || placeholderText}</p>
      {multi ? galleryGrid() : image && media('max-h-60 w-full object-cover')}
      <div className="m-2 flex items-center justify-around border-t border-neutral-200 pt-1 text-sm font-medium text-neutral-600"><Action icon={ThumbsUp} value="Like" /><Action icon={MessageCircle} value="Comment" /><Action icon={Share2} value="Share" /></div>
    </Shell>
  );

  function Avatar({ ring }: { ring?: boolean }) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded-full font-bold text-white', ring ? 'p-[2px]' : '')} style={ring ? { background: INSTAGRAM_GRADIENT } : undefined}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-800 text-xs" style={{ outline: ring ? '2px solid white' : undefined }}>{AVATAR}</span>
      </span>
    );
  }
}

const Action = ({ icon: Icon, value }: { icon: typeof Heart; value: string }) => (
  <span className="flex items-center gap-1 text-xs"><Icon size={15} /> {value}</span>
);
const Rail = ({ icon: Icon, value }: { icon: typeof Heart; value: string }) => (
  <span className="flex flex-col items-center text-[11px]"><Icon size={22} /> {value}</span>
);
