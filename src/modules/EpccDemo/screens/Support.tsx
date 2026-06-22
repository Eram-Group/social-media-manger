import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Phone, Send, Headset, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, StatusPill } from '../_components/ui';
import { supportReply, hasOpenAIKey } from '../_services/openai';

interface IMsg {
  from: 'user' | 'agent';
  text: string;
  source?: 'openai' | 'fallback';
}

const QUICK = [
  'My Instagram account won’t connect',
  'A scheduled post failed to publish',
  'How do I export a monthly report?',
  'Urgent: our page looks down',
];

export default function Support() {
  const [messages, setMessages] = useState<IMsg[]>([
    { from: 'agent', text: 'Hi! 👋 You’re connected to EPCC platform support. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const turn = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || typing) return;
    setMessages((m) => [...m, { from: 'user', text: msg }]);
    setInput('');
    setTyping(true);
    const res = await supportReply(msg, turn.current++);
    setTyping(false);
    setMessages((m) => [...m, { from: 'agent', text: res.text, source: res.source }]);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Support" subtitle="A dedicated contact, available around the clock for the Chamber." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info column */}
        <div className="flex flex-col gap-4">
          <DemoCard className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-800 text-white"><Headset size={20} /></span>
              <div>
                <p className="font-Sora text-sm font-semibold">Omar Al-Shehri</p>
                <p className="flex items-center gap-1 text-xs text-warnings-success"><span className="h-2 w-2 rounded-full bg-warnings-success" /> Online · Dedicated agent</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary-100 p-3 text-sm text-primary-900">
              <Phone size={15} /> 24/7 hotline: <span className="font-medium">+966 13 000 0000</span>
            </div>
            <Row icon={Clock} label="Avg. response" value="< 2 min" />
            <Row icon={CheckCircle2} label="This month" value="38 tickets resolved" />
            <Row icon={LifeBuoy} label="Ticket" value="#EPCC-4821 (open)" />
          </DemoCard>

          <DemoCard>
            <p className="text-sm font-semibold text-text-dark">Common topics</p>
            <div className="mt-3 flex flex-col gap-2">
              {QUICK.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:border-primary-300 hover:bg-primary-100">
                  {q}
                </button>
              ))}
            </div>
          </DemoCard>
        </div>

        {/* Chat column */}
        <DemoCard className="flex h-[70vh] flex-col p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-white"><Headset size={16} /></span>
              <div>
                <p className="text-sm font-semibold">Platform Support</p>
                <p className="text-xs text-neutral-500">Typically replies in minutes</p>
              </div>
            </div>
            <StatusPill tone={hasOpenAIKey() ? 'success' : 'info'}>{hasOpenAIKey() ? 'AI agent live' : 'Sample replies'}</StatusPill>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-surface-background px-5 py-4">
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[78%] rounded-2xl px-4 py-2.5 text-sm',
                  m.from === 'user'
                    ? 'rounded-br-sm bg-primary-800 text-white'
                    : 'rounded-bl-sm border border-neutral-200 bg-white text-neutral-800')}>
                  {m.text}
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {typing && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-end gap-2">
                  <motion.span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-800 text-white"
                    animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    <Headset size={15} />
                  </motion.span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-3">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <motion.span key={d} className="h-2 w-2 rounded-full bg-primary-600"
                          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }} />
                      ))}
                    </span>
                    <span className="text-xs text-neutral-500">Omar is typing…</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-neutral-200 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Describe your issue…"
              className="min-h-10 flex-1 rounded-lg px-3 py-2 text-sm shadow-6 outline outline-1 outline-neutral-200 focus-visible:outline-2 focus-visible:outline-primary-300"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || typing}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-800 text-white transition-opacity disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </DemoCard>
      </div>
    </div>
  );
}

const Row = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="flex items-center gap-2 text-neutral-600"><Icon size={14} /> {label}</span>
    <span className="font-medium text-neutral-800">{value}</span>
  </div>
);
