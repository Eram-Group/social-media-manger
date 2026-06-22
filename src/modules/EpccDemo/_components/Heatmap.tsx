import { useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { HEAT_DAYS, HEAT_HOURS, HEATMAP, SUGGESTED_SLOTS } from '../_data/besttime';

const withAlpha = (hex: string, aa: string) => (hex.length === 7 ? `${hex}${aa}` : hex);

// Day×hour engagement heatmap (best time to post). Colour intensity = activity;
// the peak cell is highlighted, hovering shows a detail line, and the top windows
// are surfaced as quick chips.
export default function Heatmap({ accent = '#025FCC' }: { accent?: string }) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);

  let max = 0; let peak = { r: 0, c: 0 };
  HEATMAP.forEach((row, r) => row.forEach((v, c) => { if (v > max) { max = v; peak = { r, c }; } }));

  const detail = hover
    ? { day: HEAT_DAYS[hover.r], hour: HEAT_HOURS[hover.c], val: HEATMAP[hover.r][hover.c] }
    : { day: HEAT_DAYS[peak.r], hour: HEAT_HOURS[peak.c], val: max };

  return (
    <div className="flex flex-col gap-4">
      {/* recommended windows */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-600"><Sparkles size={13} style={{ color: accent }} /> Recommended windows</span>
        {SUGGESTED_SLOTS.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: withAlpha(accent, '14'), color: accent }}>
            {s.label}<span className="rounded-full bg-white/70 px-1.5 text-[10px]">{s.score}</span>
          </span>
        ))}
      </div>

      {/* hovered/peak detail */}
      <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm">
        <TrendingUp size={15} style={{ color: accent }} />
        <span className="text-neutral-600">{hover ? 'Selected' : 'Peak'} window:</span>
        <span className="font-semibold text-text-dark">{detail.day} · {detail.hour}</span>
        <span className="ml-auto font-medium" style={{ color: accent }}>{detail.val}% activity</span>
      </div>

      {/* grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="mb-1 flex pl-10">
            {HEAT_HOURS.map((h) => <span key={h} className="w-9 text-center text-[10px] text-neutral-400">{h}</span>)}
          </div>
          {HEATMAP.map((row, r) => (
            <div key={r} className="mb-1 flex items-center">
              <span className="w-10 text-xs font-medium text-neutral-500">{HEAT_DAYS[r]}</span>
              {row.map((val, c) => {
                const isPeak = r === peak.r && c === peak.c;
                const isHover = hover?.r === r && hover?.c === c;
                return (
                  <button key={c} onMouseEnter={() => setHover({ r, c })} onMouseLeave={() => setHover(null)}
                    title={`${HEAT_DAYS[r]} ${HEAT_HOURS[c]} · ${val}% activity`}
                    className={cn('mx-0.5 flex h-9 w-8 items-center justify-center rounded-md text-[9px] font-semibold transition-transform', isHover && 'scale-110')}
                    style={{
                      background: accent,
                      opacity: Math.max(0.08, val / max),
                      outline: isPeak ? `2px solid ${accent}` : undefined,
                      outlineOffset: isPeak ? '1px' : undefined,
                      color: val / max > 0.55 ? '#fff' : 'transparent',
                    }}>
                    {val}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mt-3 flex items-center gap-2 pl-10 text-[10px] text-neutral-500">
            Less
            {[0.15, 0.35, 0.6, 0.85, 1].map((o) => <span key={o} className="h-3 w-5 rounded-sm" style={{ background: accent, opacity: o }} />)}
            More
          </div>
        </div>
      </div>
    </div>
  );
}
