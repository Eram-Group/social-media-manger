import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { generateInsight } from '../_services/openai';

// Calm, clean "AI insight" banner — a light card with a small gradient sparkle
// badge. No flashy borders; embedded across screens for a consistent AI accent.
export default function AiInsightStrip({ context, fallback, regenerate = true }: { context: string; fallback: string; regenerate?: boolean }) {
  const [text, setText] = useState(fallback);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'openai' | 'fallback'>('fallback');

  const run = async () => {
    setLoading(true);
    const res = await generateInsight(context, fallback);
    setText(res.text);
    setSource(res.source);
    setLoading(false);
  };

  return (
    <div className="relative">
      {/* soft breathing glow */}
      <motion.div aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-2xl bg-[radial-gradient(120%_140%_at_50%_0%,rgba(99,102,241,0.35),transparent_70%)] blur-md"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <div className="relative flex items-start gap-3 rounded-xl border border-indigo-100 bg-[linear-gradient(180deg,#F7F7FF,#FFFFFF)] p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white shadow-[0_2px_6px_-1px_rgba(79,70,229,0.5)]">
        <Sparkles size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">AI insight</p>
          {regenerate && (
            <button onClick={run} disabled={loading} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50">
              <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
              {loading ? 'Thinking…' : 'Regenerate'}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-800">{text}</p>
        {source === 'fallback' && <p className="mt-1 text-[11px] text-neutral-500">Sample insight — add an OpenAI key for live analysis.</p>}
      </div>
      </div>
    </div>
  );
}
