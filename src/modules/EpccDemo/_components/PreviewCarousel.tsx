import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import PostPreview from './PostPreview';
import { PlatformChip } from './ui';
import { getPlatform, TPlatformId } from '@/mock-server/platforms';
import { TPostFormat } from '@/mock-server/posts';
import { ACCOUNTS } from '@/mock-server/accounts';

const ACCOUNT_NAME = 'Eastern Province Chamber';
const handleFor = (pid: TPlatformId) =>
  ACCOUNTS.find((a) => a.platform === pid)?.handle ?? '@epchamber';
const withAlpha = (hex: string, aa: string) => (hex.length === 7 ? `${hex}${aa}` : hex);

// Polished swipeable per-platform preview (embla): a branded "stage" tinted to the
// active platform, peeking neighbours that scale/fade, animated tabs, arrows,
// counter and dots.
export default function PreviewCarousel({
  platforms,
  content,
  image,
  images,
  isVideo,
  format,
  contentByPlatform,
  tags = [],
}: {
  platforms: TPlatformId[];
  content: string;
  image?: string;
  images?: string[];
  isVideo?: boolean;
  format?: TPostFormat;
  contentByPlatform?: Partial<Record<TPlatformId, string>>;
  tags?: string[];
}) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: 'center', containScroll: false });
  const [selected, setSelected] = useState(0);

  const textFor = (p: TPlatformId) => {
    const base = (contentByPlatform?.[p] ?? content).trim();
    const tagLine = tags.length ? tags.map((t) => `#${t.replace(/^#/, '')}`).join(' ') : '';
    return [base, tagLine].filter(Boolean).join('\n\n');
  };

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  useEffect(() => {
    embla?.reInit();
  }, [embla, platforms.length]);

  if (platforms.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
        Select a platform to preview.
      </div>
    );
  }

  const active = platforms[Math.min(selected, platforms.length - 1)];
  const accent = getPlatform(active).color;
  const single = platforms.length === 1;

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-4 transition-colors"
      style={{ borderColor: withAlpha(accent, '33'), background: `linear-gradient(165deg, ${withAlpha(accent, '14')}, #ffffff 70%)` }}>
      {/* header: active platform + counter */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: active === 'snapchat' ? '#8a7e00' : accent }}>
          <PlatformChip platform={active} size="md" /> {getPlatform(active).name}
        </span>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-6">
          {selected + 1} / {platforms.length}
        </span>
      </div>

      {/* tabs */}
      {!single && (
        <div className="flex flex-wrap items-center gap-1.5">
          {platforms.map((p, i) => {
            const isActive = i === selected;
            const c = getPlatform(p).color;
            return (
              <button
                key={p}
                onClick={() => embla?.scrollTo(i)}
                className={cn('flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                  isActive ? 'scale-110' : 'opacity-55 hover:opacity-100')}
                style={isActive ? { borderColor: withAlpha(c, '88'), boxShadow: `0 0 0 2px ${withAlpha(c, '33')}` } : { borderColor: '#E3E3E3' }}
                title={getPlatform(p).name}>
                <PlatformChip platform={p} />
              </button>
            );
          })}
        </div>
      )}

      {/* carousel */}
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {platforms.map((p, i) => (
              <div key={p} className={cn('min-w-0 px-2', single ? 'flex-[0_0_100%]' : 'flex-[0_0_86%]')}>
                <div
                  className={cn('transition-all duration-300',
                    i === selected ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-45')}>
                  <PostPreview
                    platform={p}
                    handle={handleFor(p)}
                    name={ACCOUNT_NAME}
                    content={textFor(p)}
                    image={image}
                    images={images}
                    isVideo={isVideo}
                    format={format}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!single && (
          <>
            <Arrow side="left" accent={accent} disabled={selected === 0} onClick={() => embla?.scrollPrev()} />
            <Arrow side="right" accent={accent} disabled={selected === platforms.length - 1} onClick={() => embla?.scrollNext()} />
          </>
        )}
      </div>

      {/* dots */}
      {!single && (
        <div className="flex justify-center gap-1.5">
          {platforms.map((p, i) => (
            <button
              key={p}
              onClick={() => embla?.scrollTo(i)}
              className="h-2 rounded-full transition-all"
              style={{ width: i === selected ? 22 : 8, background: i === selected ? accent : '#D6D6D6' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const Arrow = ({
  side, accent, disabled, onClick,
}: { side: 'left' | 'right'; accent: string; disabled: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{ color: accent }}
    className={cn(
      'absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-4 transition-all hover:scale-110 disabled:pointer-events-none disabled:opacity-0',
      side === 'left' ? 'left-0' : 'right-0',
    )}>
    {side === 'left' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
  </button>
);
