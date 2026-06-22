import * as React from 'react';
import { IoMdEye, IoMdEyeOff } from 'react-icons/io';
import { cn } from '@/shadecn/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  currency?: string;
  url?: string;
  currencyPosition?: 'left' | 'right';
  urlPosition?: 'left' | 'right';
  currencyPadding?: string;
  urlPadding?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      url,
      type,
      currency,
      leftIcon,
      rightIcon,
      currencyPosition = 'right',
      urlPosition = 'left',
      currencyPadding = 'px-7',
      urlPadding = 'px-7',
      onKeyDown,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isInvalid = props['aria-invalid'];

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        // Only allow numbers and control keys
        const allowedKeys = [
          'Backspace',
          'Delete',
          'Tab',
          'Escape',
          'Enter',
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
        ];

        // Allow Ctrl/Cmd + A, C, V, X
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
          return;
        }

        // Only allow numbers
        if (!/^[0-9]$/.test(e.key) && !allowedKeys.includes(e.key)) {
          e.preventDefault();
        }
      }

      // Call the original onKeyDown if it exists
      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === 'number') {
        // Remove any non-numeric characters
        const value = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = value;
      }
      onChange?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (type === 'number') {
        const pastedText = e.clipboardData.getData('text');
        if (!/^[0-9]+$/.test(pastedText)) {
          e.preventDefault();
        }
      }
    };

    return (
      <div className="relative flex items-center">
        {/* Left Icon */}
        {leftIcon && <span className="absolute left-3 text-gray-500">{leftIcon}</span>}

        <input
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          className={cn(
            'min-h-10 w-full rounded-lg px-3 py-2 text-sm shadow-6 outline-1 transition-all ease-in-out',
            'bg-white placeholder:font-light placeholder:text-neutral-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Default border
            'outline outline-1 outline-neutral-200',
            // Outline on focus
            !isInvalid &&
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-300',
            // Error state outline
            isInvalid && 'outline outline-2 outline-text-light_red',
            leftIcon && 'pl-10',
            rightIcon && type !== 'password' && 'pr-10',
            url && urlPosition === 'left' && 'pl-32',
            currency && currencyPosition === 'left' && 'pl-32',
            className
          )}
          ref={ref}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onPaste={handlePaste}
          {...props}
        />

        {/* Right Icon (Password Toggle or Custom Right Icon) */}
        {type === 'password' ? (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 transform cursor-pointer text-gray-500">
            {showPassword ? <IoMdEye size={20} /> : <IoMdEyeOff size={20} />}
          </button>
        ) : (
          rightIcon && <span className="absolute right-3 text-gray-500">{rightIcon}</span>
        )}
        {currency && (
          <div
            className={cn(
              'absolute flex h-full items-center border-l border-l-neutral-200 text-neutral-700',
              currencyPosition === 'right' ? 'right-1' : 'left-1',
              currencyPadding
            )}>
            {currency}
          </div>
        )}
        {url && (
          <div
            className={cn(
              'absolute flex h-full items-center border-r border-r-neutral-200 text-neutral-700',
              urlPosition === 'right' ? 'right-1' : 'left-1',
              urlPadding
            )}>
            {url}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
