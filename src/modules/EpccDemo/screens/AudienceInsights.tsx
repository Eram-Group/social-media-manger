import { ReactNode, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Clock, Film, Eye, TrendingUp, TrendingDown, Smartphone, Languages, Repeat, Users, Activity, Heart, CalendarClock, Sparkles } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, PlatformChip } from '../_components/ui';
import AiInsightStrip from '../_components/AiInsightStrip';
import Heatmap from '../_components/Heatmap';
import { Stagger, StaggerItem } from '../_components/motion';
import { audienceFor, INTERESTS, SENTIMENT_THEMES } from '@/mock-server/audience';
import { FORMAT_BEST_TIMES, BEST_TIME_RECS } from '@/mock-server/besttime';
import { PLATFORMS, getPlatform, TPlatformId } from '@/mock-server/platforms';

type TFilter = TPlatformId | 'all';
type TDataView = 'all' | 'demographics' | 'behaviour' | 'sentiment' | 'besttime';
const withAlpha = (hex: string, aa: string) => (hex.length === 7 ? `${hex}${aa}` : hex);

const VIEWS: { key: TDataView; label: string; icon: typeof Users }[] = [
  { key: 'all', label: 'Overview', icon: Activity },
  { key: 'demographics', label: 'Demographics', icon: Users },
  { key: 'behaviour', label: 'Behaviour', icon: Activity },
  { key: 'sentiment', label: 'Sentiment', icon: Heart },
  { key: 'besttime', label: 'Best time', icon: CalendarClock },
];

export default function AudienceInsights() {
  const [filter, setFilter] = useState<TFilter>('all');
  const [dataView, setDataView] = useState<TDataView>('all');
  const v = useMemo(() => audienceFor(filter), [filter]);
  const accent = v.accent;
  const label = filter === 'all' ? 'All platforms' : getPlatform(filter).name;
  const show = (s: TDataView) => dataView === 'all' || dataView === s;

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle title="Audience Insights" subtitle="Who the Chamber reaches, how they behave, and how they feel — overall or per platform." />

      {/* Platform filter */}
      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === 'all'} accent="#025FCC" onClick={() => setFilter('all')}>All platforms</FilterPill>
        {PLATFORMS.map((p) => (
          <FilterPill key={p.id} active={filter === p.id} accent={getPlatform(p.id).color} onClick={() => setFilter(p.id)}>
            <PlatformChip platform={p.id} /> {p.name}
          </FilterPill>
        ))}
      </div>

      {/* Selected-platform banner */}
      <div className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: withAlpha(accent, '55'), background: withAlpha(accent, '10') }}>
        <div className="flex items-center gap-3">
          {filter !== 'all' && <PlatformChip platform={filter} size="lg" />}
          <div><p className="font-Sora text-lg font-semibold" style={{ color: accent }}>{label}</p><p className="text-sm text-neutral-700">{v.insight}</p></div>
        </div>
        <div className="flex shrink-0 gap-6">
          <Banner label="Reach" value={v.reach} accent={accent} />
          <Banner label="Growth" value={v.growth} accent={v.growth.startsWith('-') ? '#D50415' : '#00A87E'} />
        </div>
      </div>

      <AiInsightStrip context={`audience behaviour and demographics for the Chamber on ${label}`} fallback={v.insight} />

      {/* Key stats — always visible */}
      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Clock, label: 'Best time to post', value: v.bestTime },
          { icon: Film, label: 'Top format', value: v.topFormat },
          { icon: Eye, label: 'Avg. watch time', value: v.avgWatch },
          { icon: v.growth.startsWith('-') ? TrendingDown : TrendingUp, label: 'Follower growth', value: v.growth },
        ].map((s) => (
          <StaggerItem key={s.label}><DemoCard className="h-full p-4"><p className="flex items-center gap-1.5 text-xs text-neutral-500"><s.icon size={14} style={{ color: accent }} /> {s.label}</p><p className="mt-2 font-Sora text-lg font-semibold text-text-dark">{s.value}</p></DemoCard></StaggerItem>
        ))}
      </Stagger>

      {/* Data view selector */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1">
        {VIEWS.map((view) => (
          <button key={view.key} onClick={() => setDataView(view.key)}
            className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors', dataView === view.key ? 'bg-primary-800 text-white' : 'text-neutral-600 hover:bg-neutral-100')}>
            <view.icon size={15} /> {view.label}
          </button>
        ))}
      </div>

      {/* Unified grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {show('demographics') && (
          <DemoCard>
            <SectionTitle title="Gender" />
            <div className="mt-2 h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={v.gender} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}><Cell fill={accent} /><Cell fill={withAlpha(accent, '40')} /></Pie><Tooltip formatter={(val: number) => `${val}%`} /></PieChart></ResponsiveContainer></div>
            <div className="flex justify-center gap-4 text-sm text-neutral-700">{v.gender.map((g, i) => <span key={g.name} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: i === 0 ? accent : withAlpha(accent, '40') }} />{g.name} {g.value}%</span>)}</div>
          </DemoCard>
        )}
        {show('demographics') && (
          <DemoCard className="xl:col-span-2">
            <SectionTitle title="Age groups" />
            <div className="mt-4 h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={v.age} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" stroke="#E3E3E3" /><XAxis dataKey="group" tick={{ fontSize: 12, fill: '#757575' }} /><YAxis tick={{ fontSize: 12, fill: '#757575' }} /><Tooltip formatter={(val: number) => `${val}%`} /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill={accent} /></BarChart></ResponsiveContainer></div>
          </DemoCard>
        )}
        {show('behaviour') && (
          <DemoCard>
            <SectionTitle title="Active hours" subtitle="When this audience is online" />
            <div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={v.activeHours} margin={{ left: -24 }}><XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#757575' }} /><YAxis hide /><Tooltip formatter={(val: number) => `${val}% activity`} /><Bar dataKey="value" radius={[4, 4, 0, 0]} fill={accent} /></BarChart></ResponsiveContainer></div>
          </DemoCard>
        )}
        {show('behaviour') && (
          <DemoCard>
            <SectionTitle title="Content format performance" />
            <div className="mt-4 flex flex-col gap-3">{v.formats.map((f) => <div key={f.format}><div className="mb-1 flex justify-between text-sm"><span className="text-neutral-700">{f.format}</span><span className="font-medium text-neutral-800">{f.value}%</span></div><div className="h-2 w-full rounded-full bg-neutral-200"><div className="h-2 rounded-full" style={{ width: `${f.value}%`, background: accent }} /></div></div>)}</div>
          </DemoCard>
        )}
        {show('demographics') && (
          <DemoCard>
            <SectionTitle title="Top cities" />
            <div className="mt-4 flex flex-col gap-2.5">{v.cities.map((c) => <div key={c.city}><div className="mb-1 flex justify-between text-sm"><span className="text-neutral-700">{c.city}</span><span className="font-medium text-neutral-800">{c.value}%</span></div><div className="h-2 w-full rounded-full bg-neutral-200"><div className="h-2 rounded-full" style={{ width: `${c.value * 3}%`, background: accent }} /></div></div>)}</div>
          </DemoCard>
        )}
        {show('behaviour') && (
          <DemoCard>
            <SectionTitle title="New vs returning" />
            <div className="mt-2 h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'New', value: v.newVsReturning.new }, { name: 'Returning', value: v.newVsReturning.returning }]} dataKey="value" innerRadius={40} outerRadius={66} paddingAngle={3}><Cell fill={accent} /><Cell fill={withAlpha(accent, '40')} /></Pie><Tooltip formatter={(val: number) => `${val}%`} /></PieChart></ResponsiveContainer></div>
            <p className="flex items-center justify-center gap-1.5 text-sm text-neutral-600"><Repeat size={14} /> {v.newVsReturning.returning}% returning</p>
          </DemoCard>
        )}
        {show('behaviour') && (
          <DemoCard>
            <SectionTitle title="Device & language" />
            <Split icon={Smartphone} left={['Mobile', v.device.mobile]} right={['Desktop', v.device.desktop]} accent={accent} />
            <div className="mt-4"><Split icon={Languages} left={['Arabic', v.language.arabic]} right={['English', v.language.english]} accent={accent} /></div>
          </DemoCard>
        )}
        {show('sentiment') && (
          <DemoCard className={dataView === 'sentiment' ? 'md:col-span-2 xl:col-span-1' : ''}>
            <SectionTitle title="Sentiment" subtitle={label} />
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-200"><div className="flex h-3"><div className="bg-warnings-success" style={{ width: `${v.sentiment.positive}%` }} /><div className="bg-neutral-400" style={{ width: `${v.sentiment.neutral}%` }} /><div className="bg-text-red" style={{ width: `${v.sentiment.negative}%` }} /></div></div>
            <div className="mt-2 flex justify-between text-xs text-neutral-600"><span>👍 {v.sentiment.positive}%</span><span>😐 {v.sentiment.neutral}%</span><span>👎 {v.sentiment.negative}%</span></div>
            <div className="mt-3 flex flex-col divide-y divide-neutral-200">{SENTIMENT_THEMES.map((t) => <div key={t.theme} className="flex items-center justify-between py-1.5"><span className="text-sm text-neutral-800">{t.theme}</span><span className={cn('text-xs font-medium', { 'text-warnings-success': t.score === 'positive', 'text-neutral-500': t.score === 'neutral', 'text-text-red': t.score === 'negative' })}>{t.mentions}</span></div>)}</div>
          </DemoCard>
        )}
        {show('demographics') && (
          <DemoCard><SectionTitle title="Top hashtags" subtitle={label} /><div className="mt-4 flex flex-wrap gap-2">{v.hashtags.map((h) => <span key={h} className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: withAlpha(accent, '15'), color: accent }}>{h}</span>)}</div></DemoCard>
        )}
        {show('demographics') && (
          <DemoCard><SectionTitle title="Audience interests" /><div className="mt-4 flex flex-wrap gap-2">{INTERESTS.map((i) => <span key={i} className="rounded-full bg-secondary-200 px-3 py-1.5 text-sm text-primary-900">{i}</span>)}</div></DemoCard>
        )}
      </div>

      {/* Best time to post — full-width detailed section */}
      {show('besttime') && (
        <DemoCard className="flex flex-col gap-6">
          <SectionTitle title="Best time to post" subtitle={`When ${label.toLowerCase()} is most active — darker = higher engagement`} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2"><Heatmap accent={accent} /></div>
            {/* AI recommendation panel */}
            <div className="relative h-full">
              <motion.div aria-hidden className="pointer-events-none absolute -inset-1 rounded-2xl bg-[radial-gradient(120%_140%_at_50%_0%,rgba(99,102,241,0.35),transparent_70%)] blur-md" animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
              <div className="relative flex h-full flex-col rounded-xl border border-indigo-100 bg-[linear-gradient(180deg,#F7F7FF,#FFFFFF)] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-text-dark"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white"><Sparkles size={13} /></span> AI scheduling recommendation</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {BEST_TIME_RECS.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-neutral-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                      <span>{r.split('**').map((part, j) => (j % 2 ? <strong key={j} className="font-semibold text-text-dark">{part}</strong> : part))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {/* per-format best times */}
          <div>
            <p className="mb-3 text-sm font-semibold text-text-dark">Best time by content type</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {FORMAT_BEST_TIMES.map((f) => (
                <div key={f.format} className="rounded-lg border border-neutral-200 p-3">
                  <p className="text-sm font-medium text-text-dark">{f.format}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-neutral-600"><Clock size={11} /> {f.day} · {f.time}</p>
                  <p className="mt-1.5 text-xs font-semibold text-warnings-success">{f.lift}</p>
                  <p className="mt-1 text-[11px] text-neutral-400">{f.note}</p>
                </div>
              ))}
            </div>
          </div>
        </DemoCard>
      )}
    </div>
  );
}

const Banner = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <div className="text-right"><p className="text-xs text-neutral-500">{label}</p><p className="font-Sora text-lg font-semibold" style={{ color: accent }}>{value}</p></div>
);
const Split = ({ icon: Icon, left, right, accent }: { icon: typeof Smartphone; left: [string, number]; right: [string, number]; accent: string }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-sm"><span className="flex items-center gap-1.5 text-neutral-700"><Icon size={14} /> {left[0]}</span><span className="text-neutral-700">{right[0]}</span></div>
    <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-200"><div style={{ width: `${left[1]}%`, background: accent }} /><div style={{ width: `${right[1]}%`, background: withAlpha(accent, '33') }} /></div>
    <div className="mt-1 flex justify-between text-xs text-neutral-500"><span>{left[1]}%</span><span>{right[1]}%</span></div>
  </div>
);
const FilterPill = ({ active, accent, onClick, children }: { active: boolean; accent: string; onClick: () => void; children: ReactNode }) => (
  <button onClick={onClick} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors', active ? 'font-medium' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')} style={active ? { borderColor: withAlpha(accent, '88'), background: withAlpha(accent, '14'), color: accent } : undefined}>{children}</button>
);
