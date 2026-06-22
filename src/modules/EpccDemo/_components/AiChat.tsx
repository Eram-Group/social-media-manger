import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, RotateCcw } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAiChat } from '@/mock-server/ai-chat-store';
import { hasOpenAIKey } from '../_services/openai';
import FormattedText from './FormattedText';

const SUGGESTIONS = [
  'Give me 3 post ideas for next week',
  'When should I post on LinkedIn?',
  'Write a caption for the Investment Forum',
  'How did our content perform this month?',
];

// Reusable AI assistant chat — reads the SHARED conversation (floating widget and
// the full page stay in sync). Renders AI replies with markdown formatting.
export default function AiChat({ compact = false }: { compact?: boolean }) {
  const { messages, typing, send, reset } = useAiChat();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const submit = (t: string) => { if (!t.trim() || typing) return; send(t); setInput(''); };

  return (
    <div className="flex h-full flex-col">
      {/* messages */}
      <div className={cn('flex-1 space-y-3 overflow-y-auto', compact ? 'p-3' : 'p-4')}>
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2', m.from === 'user' ? 'justify-end' : 'justify-start')}>
            {m.from === 'ai' && <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white"><Sparkles size={14} /></span>}
            <div className={cn('max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', m.from === 'user' ? 'whitespace-pre-wrap rounded-br-sm bg-primary-800 text-white' : 'rounded-bl-sm border border-neutral-200 bg-white text-neutral-800')}>
              {m.from === 'ai' ? <FormattedText text={m.text} /> : m.text}
            </div>
          </motion.div>
        ))}
        <AnimatePresence>
          {typing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white"><Sparkles size={14} /></span>
              <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3 py-3">
                {[0, 1, 2].map((d) => <motion.span key={d} className="h-2 w-2 rounded-full bg-primary-600" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* suggestions (only on a fresh conversation) */}
      {messages.length <= 1 && (
        <div className={cn('flex flex-wrap gap-1.5', compact ? 'px-3 pb-2' : 'px-4 pb-2')}>
          {(compact ? SUGGESTIONS.slice(0, 3) : SUGGESTIONS).map((s) => (
            <button key={s} onClick={() => submit(s)} className="rounded-full border border-indigo-100 bg-[linear-gradient(135deg,#F5F3FF,#FFFFFF)] px-2.5 py-1 text-xs text-indigo-700 hover:bg-primary-100">{s}</button>
          ))}
        </div>
      )}

      {/* composer */}
      <div className={cn('flex items-center gap-2 border-t border-neutral-200', compact ? 'p-2.5' : 'p-3')}>
        {messages.length > 1 && (
          <button onClick={reset} title="New chat" className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100"><RotateCcw size={15} /></button>
        )}
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit(input)} placeholder="Ask the assistant…"
          className="min-h-10 flex-1 rounded-lg px-3 py-2 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300" />
        <button onClick={() => submit(input)} disabled={!input.trim() || typing} className="flex h-10 w-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white transition-opacity disabled:opacity-50"><Send size={16} /></button>
      </div>
      {!hasOpenAIKey() && <p className="px-3 pb-2 text-[11px] text-neutral-400">Sample mode — add an OpenAI key for live answers.</p>}
    </div>
  );
}
