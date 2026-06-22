import * as React from 'react';
import { cn } from '@/shadecn/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);

    // function to get value length
    const getValueLength = () => {
      return internalRef.current?.value.length || 0;
    };

    return (
      <div className="relative w-full">
        <textarea
          ref={(el) => {
            // Assign to both internal and external refs
            internalRef.current = el;
            if (typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }
          }}
          className={cn(
            'min-h-32 w-full rounded-lg px-3 py-2 text-sm outline-0 transition-all ease-in-out',
            'bg-white placeholder:font-light placeholder:text-neutral-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'outline outline-1 outline-neutral-200',
            {
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-300':
                !props['aria-invalid'],
            },
            { 'outline outline-2 outline-text-light_red': props['aria-invalid'] },
            className
          )}
          {...props}
        />

        {maxLength && (
          <div
            className={cn('absolute bottom-2 right-3 text-[10px] text-neutral-600', {
              'text-text-red': props['aria-invalid'],
            })}>
            {getValueLength()}/{maxLength}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
