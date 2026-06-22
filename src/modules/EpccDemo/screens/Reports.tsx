import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { Download, FileText, X, ChevronRight } from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { DemoCard, SectionTitle, StatusPill, StatCard, PlatformChip } from '../_components/ui';
import AiInsightStrip from '../_components/AiInsightStrip';
import { Backdrop, DrawerPanel } from '../_components/motion';
import { REPORTS, IReport } from '@/mock-server/reports';
import { getPlatform, platformChartColor } from '@/mock-server/platforms';

const reachToNum = (s: string) =>
  s.endsWith('M') ? parseFloat(s) * 1000 : parseFloat(s); // K-scale for the chart

export default function Reports() {
  const [toast, setToast] = useState('');
  const [open, setOpen] = useState<IReport | null>(null);
  const [period, setPeriod] = useState<'all' | 'Weekly' | 'Monthly'>('all');
  const shown = REPORTS.filter((r) => period === 'all' || r.period === period);

  const exportReport = (title: string) => {
    setToast(`Exporting “${title}” as PDF… (demo)`);
    window.setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <SectionTitle title="Reports" subtitle="Weekly and monthly performance across all platforms · click a report for the full breakdown." />
        <div className="w-48">
          <Button variant="primary" size="medium" onClick={() => exportReport('New custom report')}>
            + Generate report
          </Button>
        </div>
      </div>

      {toast && <div className="rounded-lg bg-secondary-200 p-3 text-sm font-medium text-primary-900">{toast}</div>}

      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'Weekly', 'Monthly'] as const).map((p) => {
          const count = p === 'all' ? REPORTS.length : REPORTS.filter((r) => r.period === p).length;
          return (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', period === p ? 'border-primary-300 bg-secondary-200 font-medium text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
              {p === 'all' ? 'All' : p}
              <span className={cn('rounded-full px-1.5 text-xs', period === p ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600')}>{count}</span>
            </button>
          );
        })}
      </div>

      <DemoCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <th className="px-5 py-3 font-medium">Report</th>
              <th className="px-5 py-3 font-medium">Period</th>
              <th className="px-5 py-3 font-medium">Posts</th>
              <th className="px-5 py-3 font-medium">Reach</th>
              <th className="px-5 py-3 font-medium">Engagement</th>
              <th className="px-5 py-3 font-medium">Top platform</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {shown.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-neutral-100/60" onClick={() => setOpen(r)}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-primary-800" />
                    <span className="font-medium text-text-dark">{r.title}</span>
                  </div>
                  <span className="text-xs text-neutral-500">{r.range}</span>
                </td>
                <td className="px-5 py-4">
                  <StatusPill tone={r.period === 'Monthly' ? 'info' : 'success'}>{r.period}</StatusPill>
                </td>
                <td className="px-5 py-4 text-neutral-700">{r.posts}</td>
                <td className="px-5 py-4 font-medium text-neutral-800">{r.reach}</td>
                <td className="px-5 py-4 text-neutral-700">{r.engagement}</td>
                <td className="px-5 py-4 text-neutral-700">{r.topPlatform}</td>
                <td className="px-5 py-4 text-right">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-800">
                    View <ChevronRight size={15} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DemoCard>

      {/* Detail */}
      <AnimatePresence>
        {open && (
          <Backdrop onClose={() => setOpen(null)}>
            <DrawerPanel className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-surface-background p-6 shadow-7">
            <div className="flex items-start justify-between">
              <SectionTitle title={open.title} subtitle={`${open.period} · ${open.range}`} />
              <button onClick={() => setOpen(null)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Total reach" value={open.reach} />
              <StatCard label="Engagement" value={open.engagement} />
              <StatCard label="Posts" value={`${open.posts}`} />
              <StatCard label="Follower growth" value={open.followerGrowth} />
            </div>

            <div className="mt-4">
              <AiInsightStrip
                context={`the ${open.title} performance report (${open.summary})`}
                fallback={open.summary}
              />
            </div>

            <DemoCard className="mt-4">
              <SectionTitle title="Reach by platform" />
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={open.breakdown.map((b) => ({ name: getPlatform(b.platform).name, reach: reachToNum(b.reach) }))} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#757575' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#757575' }} />
                    <Tooltip formatter={(v: number) => `${v}K reach`} />
                    <Bar dataKey="reach" radius={[6, 6, 0, 0]}>
                      {open.breakdown.map((b) => <Cell key={b.platform} fill={platformChartColor(b.platform)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DemoCard>

            <DemoCard className="mt-4 p-0">
              <p className="border-b border-neutral-200 px-5 py-3 font-Sora text-sm font-semibold">Per-platform breakdown</p>
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-200">
                  {open.breakdown.map((b) => (
                    <tr key={b.platform}>
                      <td className="px-5 py-3"><span className="flex items-center gap-2"><PlatformChip platform={b.platform} /> {getPlatform(b.platform).name}</span></td>
                      <td className="px-5 py-3 text-neutral-700">{b.reach} reach</td>
                      <td className="px-5 py-3 text-neutral-700">{b.engagement}</td>
                      <td className="px-5 py-3 text-neutral-700">{b.posts} posts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DemoCard>

            <DemoCard className="mt-4">
              <SectionTitle title="Top posts" />
              <div className="mt-3 flex flex-col divide-y divide-neutral-200">
                {open.topPosts.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-3">
                    <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{t.content}</p>
                    <div className="flex items-center gap-1">{t.platforms.map((p) => <PlatformChip key={p} platform={p} />)}</div>
                    <span className="w-20 text-right text-sm font-medium text-neutral-700">{t.reach}</span>
                  </div>
                ))}
              </div>
            </DemoCard>

            <div className="mt-5 flex justify-end gap-3 pb-6">
              <div className="w-32"><Button variant="outline" size="medium" onClick={() => setOpen(null)}>Close</Button></div>
              <div className="w-44"><Button variant="primary" size="medium" leftIcon={<Download size={16} />} onClick={() => exportReport(open.title)}>Export PDF</Button></div>
            </div>
            </DrawerPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}
