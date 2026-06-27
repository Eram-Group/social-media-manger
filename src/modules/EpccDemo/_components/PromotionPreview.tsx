'use client';

import { Heart, MessageCircle, Share2, MoreHorizontal, Send, Bookmark } from 'lucide-react';
import { FaFacebookF, FaInstagram } from 'react-icons/fa6';

// Ad placement preview — mockups of how a boosted post renders in a Facebook feed
// and an Instagram feed, like Meta Ads Manager shows before you spend.

function Media({ url }: { url?: string }) {
  if (url) return <img src={url} alt="" className="h-44 w-full object-cover" />;
  return <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-primary-100 to-secondary-200 text-xs text-primary-800">EP Chamber</div>;
}

function FacebookCard({ content, media, page }: { content: string; media?: string; page: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white">EP</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-neutral-800">{page}</p>
          <p className="text-[10px] text-neutral-500">Sponsored · <FaFacebookF className="inline" size={8} /></p>
        </div>
        <MoreHorizontal size={16} className="text-neutral-400" />
      </div>
      <p className="px-3 pb-2 text-[11px] leading-snug text-neutral-800 line-clamp-3">{content || '(no caption)'}</p>
      <Media url={media} />
      <div className="flex items-center justify-around border-t border-neutral-100 py-1.5 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1"><Heart size={13} /> Like</span>
        <span className="flex items-center gap-1"><MessageCircle size={13} /> Comment</span>
        <span className="flex items-center gap-1"><Share2 size={13} /> Share</span>
      </div>
    </div>
  );
}

function InstagramCard({ content, media, page }: { content: string; media?: string; page: string }) {
  const handle = page.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)] text-xs font-bold text-white">EP</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-neutral-800">{handle}</p>
          <p className="text-[10px] text-neutral-500">Sponsored · <FaInstagram className="inline" size={9} /></p>
        </div>
        <MoreHorizontal size={16} className="text-neutral-400" />
      </div>
      <Media url={media} />
      <div className="flex items-center gap-3 px-3 py-2 text-neutral-700">
        <Heart size={17} /><MessageCircle size={17} /><Send size={16} /><Bookmark size={16} className="ml-auto" />
      </div>
      <p className="px-3 pb-3 text-[11px] leading-snug text-neutral-800"><span className="font-semibold">{handle}</span> <span className="line-clamp-2">{content || '(no caption)'}</span></p>
    </div>
  );
}

export default function PromotionPreview({ content, media, showFb, showIg, page = 'EP Chamber' }: { content: string; media?: string; showFb: boolean; showIg: boolean; page?: string }) {
  if (!showFb && !showIg) return <p className="text-sm text-neutral-500">Select a platform to preview the placement.</p>;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {showFb && <FacebookCard content={content} media={media} page={page} />}
      {showIg && <InstagramCard content={content} media={media} page={page} />}
    </div>
  );
}
