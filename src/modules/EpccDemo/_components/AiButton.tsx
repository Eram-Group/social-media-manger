import { ReactNode } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';

// Clean, calm AI button — a single tasteful indigo→blue gradient with a soft
// shadow that lifts on hover. No flashy borders; just polished and on-brand.
export default function AiButton({
  children, onClick, loading = false, disabled = false, size = 'md', icon, className,
}: {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  icon?: ReactNode;
  className?: string;
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  const ico = size === 'sm' ? 14 : 16;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all duration-200',
        'bg-[linear-gradient(135deg,#4F46E5,#2563EB)] shadow-[0_0_16px_-3px_rgba(79,70,229,0.55),0_3px_10px_-3px_rgba(37,99,235,0.4)]',
        'hover:-translate-y-px hover:shadow-[0_0_26px_-3px_rgba(79,70,229,0.75),0_8px_18px_-5px_rgba(37,99,235,0.5)] hover:brightness-105 active:translate-y-0 active:brightness-95',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0',
        pad, className,
      )}>
      {loading ? <Loader2 size={ico} className="animate-spin" /> : (icon ?? <Sparkles size={ico} />)}
      {children}
    </button>
  );
}
