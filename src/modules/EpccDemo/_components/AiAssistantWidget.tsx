import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Maximize2 } from 'lucide-react';
import AiChat from './AiChat';
import { EPCC_ROUTES } from '../routes';

// Floating AI assistant — a glowing FAB available on every page that opens a
// compact chat popup with the Chamber AI. Hidden on the full AI Assistant page.
export default function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === EPCC_ROUTES.AI) return null; // page itself is the assistant
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-[60] flex h-[32rem] w-[24rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-[0_24px_60px_-20px_rgba(79,70,229,0.45)]">
            <div className="flex items-center justify-between bg-[linear-gradient(135deg,#6D28D9,#2563EB)] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Sparkles size={16} /></span>
                <div><p className="text-sm font-semibold">Chamber AI</p><p className="text-[11px] text-white/80">Ask me anything</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { navigate(EPCC_ROUTES.AI); setOpen(false); }} title="Open full screen" className="text-white/80 hover:text-white"><Maximize2 size={16} /></button>
                <button onClick={() => setOpen(false)} title="Close" className="text-white/80 hover:text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden"><AiChat compact /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open AI assistant"
        className="group fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6D28D9,#2563EB)] text-white shadow-[0_8px_24px_-4px_rgba(79,70,229,0.7)] transition-transform hover:scale-110 active:scale-95">
        <span aria-hidden className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#6D28D9,#2563EB)] opacity-60 blur-md transition-opacity group-hover:opacity-90" />
        <span className="relative">{open ? <X size={22} /> : <Sparkles size={22} />}</span>
      </button>
    </>
  );
}
