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
      'demo-card rounded-xl border border-neutral-200 bg-white p-6 shadow-7',
      className,
    )}
    {...props}
  />
);

export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, right, height = 240, isEmpty, emptyLabel = 'No data yet', children }) => (
  <DemoCard>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-Sora text-base font-semibold text-text-dark">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="mt-4" style={{ height }}>
      {isEmpty ? (
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">{emptyLabel}</div>
      ) : (
        children
      )}
    </div>
  </DemoCard>
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

// Shared gender palette (was duplicated per-screen).
export const GENDER_COLORS = ['#025FCC', '#DB2777', '#9CA3AF'];

// ── Skeleton loaders ────────────────────────────────────────────────────────
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('animate-pulse rounded-md bg-neutral-200/70', className)} {...props} />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <DemoCard className="p-5">
    <Skeleton className="h-3.5 w-24" />
    <Skeleton className="mt-3 h-7 w-20" />
    <Skeleton className="mt-2 h-3 w-28" />
  </DemoCard>
);

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 240 }) => (
  <DemoCard>
    <Skeleton className="h-4 w-40" />
    <Skeleton className="mt-1.5 h-3 w-56" />
    <Skeleton className="mt-5 w-full rounded-lg" style={{ height }} />
  </DemoCard>
);

export const ListRowSkeleton: React.FC<{ withMedia?: boolean }> = ({ withMedia = true }) => (
  <div className="flex items-center gap-3 py-3">
    {withMedia && <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />}
    <div className="flex-1">
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
  <div className="flex items-center gap-4 py-3">
    {Array.from({ length: cols }).map((_, i) => (
      <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-40' : 'flex-1')} />
    ))}
  </div>
);
