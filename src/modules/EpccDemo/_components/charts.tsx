'use client';

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { CHART_COLORS } from './ui';

const GRID = '#E3E3E3';
const TICK = '#757575';
const axis = { tick: { fill: TICK, fontSize: 11 }, tickLine: false, axisLine: false } as const;

export interface ChartDatum {
  label: string;
  value: number;
}

export const DonutChart: React.FC<{
  data: ChartDatum[];
  colors?: string[];
  center?: { label: string; value: string };
}> = ({ data, colors = CHART_COLORS, center }) => (
  <div className="relative h-full w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
    {center && (
      <div className="pointer-events-none absolute inset-0 -mt-6 flex flex-col items-center justify-center">
        <span className="font-Sora text-xl font-semibold text-text-dark">{center.value}</span>
        <span className="text-xs text-neutral-500">{center.label}</span>
      </div>
    )}
  </div>
);

export const TrendAreaChart: React.FC<{
  data: any[]; xKey?: string; yKey?: string; color?: string;
}> = ({ data, xKey = 'date', yKey = 'net', color = CHART_COLORS[0] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
      <defs>
        <linearGradient id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      <XAxis dataKey={xKey} {...axis} />
      <YAxis {...axis} />
      <Tooltip />
      <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} fill={`url(#grad-${yKey})`} />
    </AreaChart>
  </ResponsiveContainer>
);

export const TrendLineChart: React.FC<{
  data: any[]; xKey?: string; series: { key: string; name: string; color?: string }[];
}> = ({ data, xKey = 'date', series }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      <XAxis dataKey={xKey} {...axis} />
      <YAxis {...axis} />
      <Tooltip />
      {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
      {series.map((s, i) => (
        <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
          stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
      ))}
    </LineChart>
  </ResponsiveContainer>
);

export const CategoryBarChart: React.FC<{
  data: ChartDatum[]; color?: string; horizontal?: boolean;
}> = ({ data, color = CHART_COLORS[0], horizontal = false }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}
      margin={{ top: 4, right: 8, left: horizontal ? 8 : -16, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      {horizontal ? <XAxis type="number" {...axis} /> : <XAxis type="category" dataKey="label" {...axis} />}
      {horizontal ? <YAxis type="category" dataKey="label" width={90} {...axis} /> : <YAxis type="number" {...axis} />}
      <Tooltip />
      <Bar dataKey="value" fill={color} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export const ScatterPlot: React.FC<{
  data: { x: number; y: number; name: string }[]; xName: string; yName: string;
}> = ({ data, xName, yName }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ScatterChart margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
      <XAxis type="number" dataKey="x" name={xName} {...axis} />
      <YAxis type="number" dataKey="y" name={yName} {...axis} />
      <ZAxis range={[60, 60]} />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Scatter data={data} fill={CHART_COLORS[0]} />
    </ScatterChart>
  </ResponsiveContainer>
);

// Merge per-competitor follower histories into a single date-keyed series for a
// multi-line chart. Each output row: { date, [competitorName]: followers }.
export function mergeHistories(
  rows: { name: string; history: { takenAt: number; followers: number }[] }[],
): any[] {
  const byDate = new Map<string, any>();
  for (const r of rows) {
    for (const h of r.history) {
      const date = new Date(h.takenAt).toISOString().slice(0, 10);
      const row = byDate.get(date) ?? { date };
      row[r.name] = h.followers;
      byDate.set(date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
