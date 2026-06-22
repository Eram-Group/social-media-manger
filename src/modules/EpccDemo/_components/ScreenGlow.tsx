import { motion } from 'framer-motion';

// Full-screen "AI is thinking" ambience — drifting coloured light blobs + a
// breathing edge glow (Apple-Intelligence style). Lots of gentle movement so it
// reads as the app actively thinking. Pointer-events none; render while processing.
export default function ScreenGlow() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>

      {/* drifting aurora blobs */}
      <motion.div className="absolute -left-[10vmax] -top-[10vmax] h-[46vmax] w-[46vmax] rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.40), transparent 62%)' }}
        animate={{ x: ['0%', '30%', '5%', '0%'], y: ['0%', '18%', '32%', '0%'], scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -right-[12vmax] -top-[8vmax] h-[42vmax] w-[42vmax] rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.40), transparent 62%)' }}
        animate={{ x: ['0%', '-26%', '-6%', '0%'], y: ['0%', '24%', '10%', '0%'], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-[12vmax] left-1/3 h-[40vmax] w-[40vmax] rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.34), transparent 62%)' }}
        animate={{ x: ['0%', '-24%', '20%', '0%'], y: ['0%', '-14%', '6%', '0%'], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-[10vmax] -right-[8vmax] h-[38vmax] w-[38vmax] rounded-full blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.28), transparent 62%)' }}
        animate={{ x: ['0%', '-18%', '0%'], y: ['0%', '-22%', '0%'], scale: [1.05, 1.2, 1.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />

      {/* breathing edge glow */}
      <motion.div className="absolute inset-0"
        animate={{ boxShadow: [
          'inset 0 0 90px 6px rgba(99,102,241,0.45)',
          'inset 0 0 150px 18px rgba(168,85,247,0.55)',
          'inset 0 0 120px 10px rgba(37,99,235,0.50)',
          'inset 0 0 90px 6px rgba(99,102,241,0.45)',
        ] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }} />
    </motion.div>
  );
}
