import React from 'react';
import { LuLoader } from 'react-icons/lu';
import { cn } from '@/shadecn/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'outline'
    | 'outlined-secondry'
    | 'tinted'
    | 'text'
    | 'error'
    | 'destructive';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disable?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'small',
  loading = false,
  disable = false,
  className,
  children,
  leftIcon,
  rightIcon,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        // Base styles
        'flex w-full items-center justify-center gap-3 rounded-lg px-3 leading-6',
        'cursor-pointer select-none whitespace-nowrap transition-colors ease-in-out',
        'first-letter:capitalize',
        'disabled:cursor-default',

        // Variant styles
        {
          'bg-primary-800 text-secondary-100 hover:shadow-4 focus:outline focus:outline-stroke-Primary-light':
            variant === 'primary',
        },
        {
          'border border-neutral-400 bg-white text-neutral-1000 hover:shadow-5':
            variant === 'outline',
        },
        {
          'border border-neutral-400 bg-white text-primary-800 hover:shadow-5':
            variant === 'outlined-secondry',
        },
        {
          'bg-secondary-200 text-primary-900 outline-stroke-Primary-light hover:shadow-1 focus:outline':
            variant === 'tinted',
        },
        {
          'text-primary-800 hover:bg-primary-800/10 focus:outline focus:outline-stroke-Primary-light':
            variant === 'text',
        },
        {
          'bg-text-red/5 text-text-red hover:shadow-1 focus:outline focus:outline-text-red/5':
            variant === 'error',
        },
        {
          'bg-red-600 text-white hover:bg-red-700': variant === 'destructive',
        },

        // Size styles
        { 'py-2 text-sm font-medium': size === 'small' },
        { 'px-5 py-2 text-base font-medium': size === 'medium' },
        { 'px-6 py-3 text-base font-semibold  ': size === 'large' },

        // Disabled & Loading styles
        {
          'pointer-events-none opacity-70': disable || loading,
          'bg-neutral-400 text-neutral-600 shadow-none':
            disable && ['primary', 'secondary', 'tertiary'].includes(variant),
          'border border-neutral-300 text-neutral-300 shadow-none':
            disable && ['outline', 'outlined-secondry', 'error'].includes(variant),
          '!text-neutral-400 shadow-none': disable && variant === 'text',
        },

        className
      )}
      {...props}>
      {/* Loading Indicator */}
      {loading && (
        <span className="animate-spin">
          <LuLoader
            size={20}
            className={cn({
              'stroke-gray-500': variant !== 'primary' && !disable,
              'stroke-white': variant === 'primary' && !disable,
              'stroke-gray-400': disable,
            })}
          />
        </span>
      )}

      {/* Left Icon (if provided) */}
      {leftIcon && <span>{leftIcon}</span>}

      {/* Button Text */}
      {children}

      {/* Right Icon (if provided) */}
      {rightIcon && <span>{rightIcon}</span>}
    </button>
  );
};

export default Button;
