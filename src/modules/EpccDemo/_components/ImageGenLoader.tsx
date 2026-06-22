import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Clapperboard } from 'lucide-react';

// Clean, calm generative loader — a soft light canvas with a gentle sheen sweep,
// a pulsing brand icon, cycling status text and an indeterminate progress bar.
// Adapts to image vs video generation.
const PHASES_IMAGE = ['Understanding your prompt…', 'Composing the scene…', 'Painting details…', 'Adding brand polish…', 'Almost ready…'];
const PHASES_VIDEO = ['Understanding your prompt…', 'Storyboarding the scene…', 'Generating frames…', 'Adding motion & sound…', 'Encoding the video…'];

export default function ImageGenLoader({ hint, kind = 'image' }: { hint?: string; kind?: 'image' | 'video' }) {
  const phases = kind === 'video' ? PHASES_VIDEO : PHASES_IMAGE;
  const Icon = kind === 'video' ? Clapperboard : Wand2;
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase(0);
    const t = window.setInterval(() => setPhase((p) => (p + 1) % phases.length), 1600);
    return () => window.clearInterval(t);
  }, [phases.length]);

  return (
    <div className="relative flex aspect-[16/10] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-indigo-100 bg-[linear-gradient(135deg,#EEF0FF,#F5F8FF_55%,#EAF6FF)]">
      {/* gentle sheen sweep */}
      <motion.div aria-hidden className="absolute inset-0"
        style={{ background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%)', backgroundSize: '220% 100%' }}
        animate={{ backgroundPosition: ['-60% 0%', '160% 0%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />

      <motion.div className="z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white shadow-[0_6px_16px_-4px_rgba(79,70,229,0.6)]"
        animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
        <Icon size={26} />
      </motion.div>

      <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="z-10 mt-4 text-sm font-medium text-neutral-700">
        {phases[phase]}
      </motion.p>
      {hint && <p className="z-10 mt-1 text-[11px] text-neutral-500">{hint}</p>}

      <div className="z-10 mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-white/70">
        <motion.div className="h-full w-2/5 rounded-full bg-[linear-gradient(90deg,#6366F1,#2563EB)]"
          animate={{ x: ['-110%', '260%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}
