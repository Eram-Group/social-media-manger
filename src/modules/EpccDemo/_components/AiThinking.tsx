import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// "AI is thinking" panel — a glowing pulsing orb with cycling status messages.
// Used while the AI crafts the promotion plan. Calm, premium, not flashy.
const MSGS = [
  'Reading your post & audience…',
  'Comparing platform performance…',
  'Finding the best budget split…',
  'Predicting reach & cost-per-result…',
  'Finalising your plan…',
];

export default function AiThinking({ title = 'AI is crafting your campaign…' }: { title?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((p) => (p + 1) % MSGS.length), 1100);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-14">
      <div className="relative">
        {/* soft breathing halo */}
        <motion.div aria-hidden className="absolute -inset-7 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.45),transparent_70%)] blur-2xl"
          animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.15, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />
        {/* orbiting spark */}
        <motion.div aria-hidden className="absolute -inset-3 rounded-full border border-indigo-200/70"
          animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#6366F1] shadow-[0_0_8px_2px_rgba(99,102,241,0.6)]" />
        </motion.div>
        <motion.div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6D28D9,#2563EB)] text-white shadow-[0_8px_24px_-6px_rgba(79,70,229,0.7)]"
          animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          <Sparkles size={28} />
        </motion.div>
      </div>

      <p className="font-Sora text-base font-semibold text-text-dark">{title}</p>
      <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-neutral-500">{MSGS[i]}</motion.p>

      <div className="h-1.5 w-52 overflow-hidden rounded-full bg-neutral-200">
        <motion.div className="h-full w-2/5 rounded-full bg-[linear-gradient(90deg,#6366F1,#2563EB)]"
          animate={{ x: ['-110%', '260%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }} />
      </div>
    </div>
  );
}
