import { Sparkles } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { SectionTitle } from '../_components/ui';
import AiChat from '../_components/AiChat';
import { hasOpenAIKey } from '../_services/openai';

export default function AiAssistant() {
  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[480px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionTitle title="AI Assistant" subtitle="Chat with your Chamber AI — plan content, write posts, analyse performance." />
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', hasOpenAIKey() ? 'bg-warnings-successBg text-warnings-success' : 'bg-neutral-100 text-neutral-600')}>
          {hasOpenAIKey() ? '● OpenAI connected' : '○ Sample mode'}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-7">
        {/* subtle AI header strip */}
        <div className="flex items-center gap-2 border-b border-neutral-100 bg-[linear-gradient(135deg,#F5F3FF,#FFFFFF)] px-4 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white"><Sparkles size={14} /></span>
          <div><p className="text-sm font-semibold text-text-dark">Chamber AI</p><p className="text-[11px] text-neutral-500">Always here to help</p></div>
        </div>
        <div className="h-[calc(100%-3.25rem)]">
          <AiChat />
        </div>
      </div>
    </div>
  );
}
