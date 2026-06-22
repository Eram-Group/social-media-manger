import React from 'react';
import { cn } from '@/shadecn/lib/utils';
import { getPlatform, INSTAGRAM_GRADIENT, TPlatformId } from '@/mock-server/platforms';

// Lightweight presentational primitives for the EPCC demo. They use the same
// Tailwind design tokens as the real app so the demo looks production-grade,
// but stay self-contained inside the demo module.

export const DemoCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'rounded-xl border border-neutral-200 bg-white p-6 shadow-7',
      className,
    )}
    {...props}
  />
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <div className="flex flex-col gap-1">
    <h2 className="font-Sora text-lg font-semibold text-text-dark">{title}</h2>
    {subtitle && <p className="text-sm text-neutral-600">{subtitle}</p>}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: string;
  delta?: number;
}> = ({ label, value, delta }) => (
  <DemoCard className="p-5">
    <p className="text-sm text-neutral-600">{label}</p>
    <p className="mt-2 font-Sora text-2xl font-semibold text-text-dark">{value}</p>
    {typeof delta === 'number' && (
      <p
        className={cn(
          'mt-1 text-xs font-medium',
          delta >= 0 ? 'text-text-green' : 'text-text-red',
        )}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs last period
      </p>
    )}
  </DemoCard>
);

const SIZES = {
  xs: { box: 'h-5 w-5', icon: 11 },
  sm: { box: 'h-6 w-6', icon: 13 },
  md: { box: 'h-9 w-9', icon: 18 },
  lg: { box: 'h-12 w-12', icon: 24 },
} as const;

export const PlatformChip: React.FC<{
  platform: TPlatformId;
  size?: keyof typeof SIZES;
  withLabel?: boolean;
}> = ({ platform, size = 'sm', withLabel = false }) => {
  const p = getPlatform(platform);
  const s = SIZES[size];
  const Icon = p.Icon;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn('flex items-center justify-center rounded-full', s.box)}
        style={{
          background: platform === 'instagram' ? INSTAGRAM_GRADIENT : p.color,
          color: p.textOnBrand,
        }}>
        <Icon size={s.icon} />
      </span>
      {withLabel && <span className="text-sm text-neutral-800">{p.name}</span>}
    </span>
  );
};

export const StatusPill: React.FC<{ tone: 'success' | 'caution' | 'info'; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
      {
        'bg-warnings-successBg text-warnings-success': tone === 'success',
        'bg-warnings-cautionBg text-warnings-caution': tone === 'caution',
        'bg-secondary-200 text-primary-900': tone === 'info',
      },
    )}>
    {children}
  </span>
);

export const formatFollowers = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : `${n}`;

// Shared chart palette (brand tokens as hex for recharts).
export const CHART_COLORS = ['#025FCC', '#4ED6FC', '#F0C500', '#00A87E', '#649DE0', '#01397A'];
