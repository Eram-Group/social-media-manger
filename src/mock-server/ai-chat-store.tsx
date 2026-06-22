import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { assistantReply } from '@/modules/EpccDemo/_services/openai';

// Shared AI-assistant conversation so the floating widget and the full AI Assistant
// page use the SAME chat — switching between them (or reopening the widget) keeps
// the history and any in-progress reply.
export interface IChatMsg { from: 'user' | 'ai'; text: string }

const GREETING: IChatMsg = {
  from: 'ai',
  text: 'Hi! 👋 I\'m your Chamber AI assistant. Ask me to plan content, write posts, find the best times, or analyse performance.',
};

interface IAiChatCtx {
  messages: IChatMsg[];
  typing: boolean;
  send: (text: string) => void;
  reset: () => void;
}
const Ctx = createContext<IAiChatCtx | null>(null);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<IChatMsg[]>([GREETING]);
  const [typing, setTyping] = useState(false);
  const turn = useRef(0);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setMessages((m) => [...m, { from: 'user', text: t }]);
    setTyping(true);
    const res = await assistantReply(t, turn.current++);
    setTyping(false);
    setMessages((m) => [...m, { from: 'ai', text: res.text }]);
  };
  const reset = () => { setMessages([GREETING]); turn.current = 0; };

  return <Ctx.Provider value={{ messages, typing, send, reset }}>{children}</Ctx.Provider>;
}

export function useAiChat(): IAiChatCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAiChat must be used within AiChatProvider');
  return c;
}
