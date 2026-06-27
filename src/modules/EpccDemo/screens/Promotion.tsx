'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { Eye, MousePointerClick, Target, CalendarRange, TrendingUp, CheckCircle2, Award, Users, Sparkles, ArrowLeft, ArrowRight, X, FileText } from 'lucide-react';
import { DemoCard, SectionTitle, PlatformChip, formatFollowers } from '../_components/ui';
import { DsSelect, DsField, DsDatePicker } from '../_components/form';
import AiButton from '../_components/AiButton';
import AiThinking from '../_components/AiThinking';
import ScreenGlow from '../_components/ScreenGlow';
import PromotionPreview from '../_components/PromotionPreview';
import { Backdrop, ModalPanel } from '../_components/motion';
import { getPlatform, TPlatformId } from '@/mock-server/platforms';
import { todayYmd } from '../_components/calendar-utils';
import { getPostAnalytics } from '@/mock-server/posts';
import { usePosts } from '@/mock-server/posts-store';
import { generateInsight } from '../_services/openai';

const OBJECTIVES = [
  { key: 'awareness', label: 'Brand awareness', icon: Eye, ctr: 0.012, conv: 0, resultLabel: 'Engagements', platforms: ['instagram', 'facebook', 'tiktok'] as TPlatformId[], audience: 'General public', budget: 4000 },
  { key: 'traffic', label: 'Website traffic', icon: MousePointerClick, ctr: 0.045, conv: 0, resultLabel: 'Link clicks', platforms: ['linkedin', 'x', 'facebook'] as TPlatformId[], audience: 'Investors', budget: 6000 },
  { key: 'registrations', label: 'Event registrations', icon: Award, ctr: 0.05, conv: 0.18, resultLabel: 'Registrations', platforms: ['linkedin', 'instagram', 'facebook'] as TPlatformId[], audience: 'SME owners', budget: 9000 },
] as const;
const AUDIENCES = ['SME owners', 'Investors', 'Young professionals', 'Women in business', 'General public'];
const Q = ['Post', 'Objective', 'Audience'];

// Detailed targeting (competitive with real ad managers).
const LOCATIONS: { key: string; reach: number }[] = [
  { key: 'Eastern Province', reach: 2_800_000 },
  { key: 'Riyadh', reach: 4_500_000 },
  { key: 'Jeddah', reach: 2_600_000 },
  { key: 'Dammam', reach: 900_000 },
  { key: 'Khobar', reach: 500_000 },
  { key: 'All Saudi Arabia', reach: 18_000_000 },
];
const INTERESTS = ['Business', 'Entrepreneurship', 'Investing', 'SME owners', 'Trade & Export', 'Real Estate', 'Technology', 'Finance'];

export default function Promotion() {
  const { posts } = usePosts();
  const params = useSearchParams();
  const promotable = posts.filter((p) => p.status !== 'draft');
  const preselect = params.get('post');
  const initialPostId = preselect && promotable.some((p) => p.id === preselect) ? preselect : promotable[0]?.id ?? '';

  const [postId, setPostId] = useState(initialPostId);
  const [objective, setObjective] = useState<typeof OBJECTIVES[number]['key']>('registrations');
  const [budget, setBudget] = useState(9000);
  const [days, setDays] = useState(7);
  const [audience, setAudience] = useState('SME owners');
  // Detailed targeting (competitive with real ad managers)
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(55);
  const [gender, setGender] = useState<'all' | 'female' | 'male'>('all');
  const [locations, setLocations] = useState<string[]>(['Eastern Province']);
  const [interests, setInterests] = useState<string[]>(['Business']);
  // Schedule + pacing + goal optimizer
  const [startDate, setStartDate] = useState(todayYmd());
  const [pacing, setPacing] = useState<'daily' | 'lifetime'>('daily');
  const [goalResults, setGoalResults] = useState('');
  // A/B split test
  const [abEnabled, setAbEnabled] = useState(false);
  const [audienceB, setAudienceB] = useState('Investors');
  // Launched-boosts tracker (local until ads_read is connected)
  const [boosts, setBoosts] = useState<{ id: string; content: string; objective: string; budget: number; days: number; platforms: string[]; startDate: string; status: string }[]>([]);
  const [platforms, setPlatforms] = useState<TPlatformId[]>(promotable.find((p) => p.id === initialPostId)?.platforms ?? []);
  const [aiNote, setAiNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; needsSetup?: boolean; message?: string; requirements?: string[]; adsManagerUrl?: string } | null>(null);

  // AI plan modal
  const [aiOpen, setAiOpen] = useState(false);
  const [mStep, setMStep] = useState(0);
  const [mPost, setMPost] = useState(initialPostId);
  const [mObj, setMObj] = useState<typeof OBJECTIVES[number]['key']>('registrations');
  const [mAud, setMAud] = useState('SME owners');
  const [thinking, setThinking] = useState(false);

  const obj = OBJECTIVES.find((o) => o.key === objective)!;
  const post = promotable.find((p) => p.id === postId);
  const organicReach = post && getPostAnalytics(post).published ? getPostAnalytics(post).reach : 0;
  const topPost = promotable.filter((p) => p.status === 'published')
    .map((p) => ({ p, eng: getPostAnalytics(p).engagementRate, reach: getPostAnalytics(p).reach }))
    .sort((x, y) => y.eng - x.eng)[0];

  const fbRef = post?.remoteRefs?.find((r) => r.platform === 'facebook');
  const launch = async () => {
    setLaunching(true); setResult(null);
    try {
      const res = await fetch('/api/promote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective, budgetSar: budget, days, platforms, objectStoryId: fbRef?.remoteId, postContent: post?.content, startDate, pacing, targeting: { ageMin, ageMax, gender, locations, interests } }),
      }).then((r) => r.json());
      setResult(res);
      if (res.ok) {
        saveBoosts([{ id: res.ids?.adId ?? `b_${Date.now()}`, content: (post?.content ?? '').slice(0, 60), objective, budget, days, platforms, startDate, status: 'paused' }, ...boosts]);
      }
    } catch (e) {
      setResult({ ok: false, message: (e as Error).message });
    }
    setLaunching(false);
  };

  const selectPost = (id: string) => { setPostId(id); setPlatforms(promotable.find((p) => p.id === id)?.platforms ?? []); };
  const togglePlatform = (id: TPlatformId) => setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  // Realistic estimate based on ad CPM (cost per 1,000 impressions). Blended
  // Facebook/Instagram CPM in KSA is ~25 SAR; people see an ad ~1.8× on average,
  // so reach = impressions / frequency. (This is how Meta actually prices reach —
  // budget buys impressions, not a flat multiple of spend.)
  const CPM = 25;        // SAR per 1,000 impressions
  const FREQ = 1.8;      // avg impressions per person
  const impressions = Math.round((budget / CPM) * 1000);
  const reach = Math.round(impressions / FREQ);
  const clicks = Math.round(impressions * obj.ctr);
  const results = obj.conv > 0 ? Math.round(clicks * obj.conv) : clicks;
  const costPerResult = results > 0 ? budget / results : 0;
  // Recommended budget: enough to roughly double this post's organic reach
  // (or the objective's default if the post hasn't published yet). Rounded to 500.
  const targetAddReach = Math.max(8000, organicReach * 2);
  const recommendedBudget = Math.min(50000, Math.max(2000, Math.round((targetAddReach * FREQ / 1000 * CPM) / 500) * 500));
  const dailyBudget = Math.round(budget / days);

  // Estimated audience size from the detailed targeting (narrows as you add filters).
  const toggleLoc = (k: string) => setLocations((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const toggleInterest = (k: string) => setInterests((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const audienceSize = useMemo(() => {
    const base = (locations.includes('All Saudi Arabia') || locations.length === 0)
      ? 18_000_000
      : locations.reduce((s, k) => s + (LOCATIONS.find((l) => l.key === k)?.reach ?? 0), 0);
    const genderF = gender === 'all' ? 1 : 0.5;
    const ageF = Math.max(0.12, (ageMax - ageMin) / (65 - 18));
    const interestF = interests.length ? Math.max(0.12, 1 - interests.length * 0.13) : 1;
    return Math.round(base * genderF * ageF * interestF);
  }, [locations, gender, ageMin, ageMax, interests]);
  const breadth = audienceSize > 6_000_000 ? { label: 'Broad', pct: 90 } : audienceSize > 1_200_000 ? { label: 'Balanced', pct: 55 } : { label: 'Specific', pct: 25 };

  // Goal optimizer: budget needed to hit a target number of results.
  const perResultCost = (CPM / 1000) / (obj.ctr * (obj.conv || 1)); // SAR per result
  const suggestedBudget = goalResults ? Math.min(50000, Math.max(1000, Math.round((Number(goalResults) * perResultCost) / 500) * 500)) : 0;
  // A/B: variant B targets a different audience → simulate a slightly different efficiency.
  const resultsB = Math.round(results * 0.82);
  const cprB = resultsB > 0 ? budget / resultsB : 0;
  const abWinner: 'A' | 'B' = costPerResult > 0 && cprB > 0 ? (costPerResult <= cprB ? 'A' : 'B') : 'A';

  // Launched-boosts tracker (localStorage until ads_read is connected).
  useEffect(() => { try { setBoosts(JSON.parse(localStorage.getItem('epcc_boosts') || '[]')); } catch { /* */ } }, []);
  const saveBoosts = (next: typeof boosts) => { setBoosts(next); try { localStorage.setItem('epcc_boosts', JSON.stringify(next)); } catch { /* */ } };

  const openAi = () => { setMPost(postId); setMObj(objective); setMAud(audience); setMStep(0); setAiOpen(true); };
  const generatePlan = async () => {
    setAiOpen(false);   // close the questions
    setThinking(true);  // and let the whole page glow while AI works
    const o = OBJECTIVES.find((x) => x.key === mObj)!;
    const avail = promotable.find((p) => p.id === mPost)?.platforms ?? [];
    const rec = o.platforms.filter((pl) => avail.includes(pl));
    const finalPlatforms = rec.length ? rec : avail;
    const [res] = await Promise.all([
      generateInsight(
        `the best paid-promotion plan to boost this post for the "${o.label}" objective targeting ${mAud}`,
        `Boost on ${finalPlatforms.map((p) => getPlatform(p).name).join(', ')} with ${o.budget.toLocaleString()} SAR over 7 days, targeting ${mAud} — the strongest cost-per-result for ${o.label.toLowerCase()}.`,
      ),
      new Promise((r) => window.setTimeout(r, 2200)),
    ]);
    // apply the plan to the page
    setPostId(mPost); setObjective(mObj); setAudience(mAud); setBudget(o.budget); setPlatforms(finalPlatforms); setAiNote(res.text);
    setThinking(false); setAiOpen(false); setMStep(0);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Paid Promotion" subtitle="Boost Chamber content with paid reach." />
        <div className="w-44"><AiButton onClick={openAi}>Plan with AI</AiButton></div>
      </div>

      {aiNote && (
        <div className="overflow-hidden rounded-xl border border-indigo-100 bg-[linear-gradient(135deg,#F5F3FF,#FFFFFF_60%)] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-dark"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366F1,#2563EB)] text-white"><Sparkles size={13} /></span> AI plan applied — “{obj.label}”</p>
          <p className="mt-2 text-sm text-neutral-700">{aiNote}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Setup */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DemoCard className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><Target size={16} className="text-primary-800" /> Campaign objective</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {OBJECTIVES.map((o) => (
                <button key={o.key} onClick={() => { setObjective(o.key); setBudget(o.budget); }}
                  className={cn('flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all', objective === o.key ? 'border-primary-400 bg-primary-100 ring-2 ring-primary-200' : 'border-neutral-200 hover:bg-neutral-100')}>
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', objective === o.key ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600')}><o.icon size={18} /></span>
                  <span className="text-sm font-medium text-text-dark">{o.label}</span>
                  <span className="text-xs text-neutral-500">Optimised for {o.resultLabel.toLowerCase()}</span>
                </button>
              ))}
            </div>
          </DemoCard>

          <DemoCard className="flex flex-col gap-5">
            {topPost && (
              <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-[linear-gradient(135deg,#F5F3FF,#FFFFFF_60%)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600"><Sparkles size={12} /> AI pick · your top post to boost</p>
                  <p className="mt-0.5 truncate text-sm text-neutral-800">{topPost.p.content}</p>
                  <p className="text-xs text-neutral-500">{topPost.eng}% engagement · {formatFollowers(topPost.reach)} reach</p>
                </div>
                {postId === topPost.p.id ? <span className="flex shrink-0 items-center gap-1 rounded-full bg-warnings-successBg px-3 py-1.5 text-xs font-medium text-warnings-success"><CheckCircle2 size={13} /> Selected</span>
                  : <button onClick={() => selectPost(topPost.p.id)} className="shrink-0 rounded-lg bg-primary-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-900">Use this post</button>}
              </div>
            )}
            <DsSelect label="Post to boost" value={postId} onChange={selectPost} options={promotable.map((p) => ({ value: p.id, label: `${p.content.slice(0, 56)}…` }))} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-neutral-800">Budget: <span className="text-primary-800">{budget.toLocaleString()} SAR</span> <span className="font-normal text-neutral-500">· ≈{dailyBudget.toLocaleString()}/day</span></label>
                <input type="range" min={1000} max={50000} step={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-3 w-full accent-primary-800" />
                <button onClick={() => setBudget(recommendedBudget)}
                  className={cn('mt-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors', budget === recommendedBudget ? 'bg-warnings-successBg text-warnings-success' : 'bg-secondary-200 text-primary-900 hover:bg-primary-100')}>
                  <Sparkles size={11} /> {budget === recommendedBudget ? 'Using recommended budget' : `Recommended: ${recommendedBudget.toLocaleString()} SAR`}
                </button>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-800"><CalendarRange size={14} /> Duration: <span className="text-primary-800">{days} days</span></label>
                <input type="range" min={3} max={30} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-3 w-full accent-primary-800" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-800">Boost on <span className="font-normal text-neutral-500">· where this post is published</span></label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(post?.platforms ?? []).map((pid) => {
                  const active = platforms.includes(pid);
                  const recommended = obj.platforms.includes(pid);
                  return (
                    <button key={pid} onClick={() => togglePlatform(pid)} className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', active ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
                      <PlatformChip platform={pid} /> {getPlatform(pid).name}
                      {recommended && <span title={`AI recommends ${getPlatform(pid).name} for ${obj.label}`} className="rounded-full bg-warnings-successBg px-1.5 text-[10px] font-medium text-warnings-success">AI ✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-neutral-500"><span className="rounded-full bg-warnings-successBg px-1.5 font-medium text-warnings-success">AI ✓</span> = recommended by AI for your “{obj.label}” objective.</p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-800"><Users size={14} /> Audience preset</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {AUDIENCES.map((aud) => (
                  <button key={aud} onClick={() => setAudience(aud)} className={cn('rounded-full border px-3 py-1.5 text-sm', audience === aud ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
                    {aud}{obj.audience === aud && <span title={`AI recommends targeting ${aud} for ${obj.label}`} className="ml-1 text-[10px] font-medium text-warnings-success">AI ✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </DemoCard>

          {/* Placement preview */}
          <DemoCard className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><Eye size={16} className="text-primary-800" /> Placement preview</span>
            <PromotionPreview content={post?.content ?? ''} media={post?.media?.[0]} showFb={platforms.includes('facebook')} showIg={platforms.includes('instagram')} />
          </DemoCard>

          {/* Detailed targeting + estimated audience size */}
          <DemoCard className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><Target size={16} className="text-primary-800" /> Detailed targeting</span>
              <div className="text-right">
                <p className="font-Sora text-lg font-semibold text-primary-800">{formatFollowers(audienceSize)}</p>
                <p className="text-[11px] text-neutral-500">estimated audience · {breadth.label}</p>
              </div>
            </div>
            {/* breadth meter */}
            <div className="h-2 w-full rounded-full bg-neutral-200"><div className="h-2 rounded-full bg-gradient-to-r from-primary-800 to-accent-800" style={{ width: `${breadth.pct}%` }} /></div>

            {/* Age */}
            <div>
              <label className="text-sm font-medium text-neutral-800">Age: <span className="text-primary-800">{ageMin}–{ageMax}</span></label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div><span className="text-xs text-neutral-500">Min</span><input type="range" min={13} max={64} value={ageMin} onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))} className="w-full accent-primary-800" /></div>
                <div><span className="text-xs text-neutral-500">Max</span><input type="range" min={14} max={65} value={ageMax} onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))} className="w-full accent-primary-800" /></div>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="text-sm font-medium text-neutral-800">Gender</label>
              <div className="mt-2 flex gap-2">
                {(['all', 'female', 'male'] as const).map((g) => (
                  <button key={g} onClick={() => setGender(g)} className={cn('flex-1 rounded-lg border px-3 py-1.5 text-sm capitalize', gender === g ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>{g === 'all' ? 'All' : g === 'female' ? 'Women' : 'Men'}</button>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="text-sm font-medium text-neutral-800">Locations</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {LOCATIONS.map((l) => (
                  <button key={l.key} onClick={() => toggleLoc(l.key)} className={cn('rounded-full border px-3 py-1.5 text-sm', locations.includes(l.key) ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>{l.key}</button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="text-sm font-medium text-neutral-800">Interests <span className="font-normal text-neutral-500">· narrows the audience</span></label>
              <div className="mt-2 flex flex-wrap gap-2">
                {INTERESTS.map((it) => (
                  <button key={it} onClick={() => toggleInterest(it)} className={cn('rounded-full border px-3 py-1.5 text-sm', interests.includes(it) ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>{it}</button>
                ))}
              </div>
            </div>
          </DemoCard>

          {/* Schedule + budget optimizer */}
          <DemoCard className="flex flex-col gap-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><CalendarRange size={16} className="text-primary-800" /> Schedule &amp; budget optimizer</span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DsDatePicker label="Start date" value={startDate} onChange={setStartDate} />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-neutral-800">Budget pacing</span>
                <div className="flex gap-2">
                  {(['daily', 'lifetime'] as const).map((p) => (
                    <button key={p} onClick={() => setPacing(p)} className={cn('flex-1 rounded-lg border px-3 py-2 text-sm capitalize', pacing === p ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>{p}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-100/50 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <DsField label={`Goal: ${obj.resultLabel.toLowerCase()} you want`} value={goalResults} onChange={(v) => setGoalResults(v.replace(/[^0-9]/g, ''))} placeholder="e.g. 200" className="w-40" />
                {suggestedBudget > 0 && <Button variant="primary" size="medium" className="!w-auto" leftIcon={<Sparkles size={14} />} onClick={() => setBudget(suggestedBudget)}>Use {suggestedBudget.toLocaleString()} SAR</Button>}
              </div>
              {suggestedBudget > 0 && <p className="mt-2 text-xs text-neutral-500">≈ {perResultCost.toFixed(1)} SAR per result at current targeting.</p>}
            </div>
          </DemoCard>

          {/* A/B split test */}
          <DemoCard className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><Award size={16} className="text-primary-800" /> A/B test (optional)</span>
              <button role="switch" aria-checked={abEnabled} onClick={() => setAbEnabled((v) => !v)} className={cn('relative h-6 w-11 rounded-full transition-colors', abEnabled ? 'bg-primary-800' : 'bg-neutral-300')}><span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', abEnabled ? 'left-[22px]' : 'left-0.5')} /></button>
            </div>
            <p className="text-sm text-neutral-600">Not sure which audience works best? Turn this on to run <span className="font-medium">two versions at once</span>. We split your {budget.toLocaleString()} SAR 50/50, show each audience its own version, and after a few days the one with the cheaper cost-per-result wins.</p>

            {abEnabled && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Variant A — fixed to current audience */}
                  <div className="flex flex-col gap-1.5 rounded-xl border-2 border-primary-300 bg-primary-100/40 p-3">
                    <span className="text-xs font-semibold uppercase text-primary-900">Version A</span>
                    <span className="text-sm font-medium text-neutral-800">{audience}</span>
                    <div className="mt-1 flex items-center justify-between text-xs text-neutral-600">
                      <span>{formatFollowers(Math.round(results / 2))} {obj.resultLabel.toLowerCase()}</span>
                      <span className="font-semibold">{costPerResult.toFixed(1)} SAR each</span>
                    </div>
                    <span className="text-[11px] text-neutral-400">{Math.round(budget / 2).toLocaleString()} SAR</span>
                  </div>
                  {/* Variant B — pick a second audience */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-3">
                    <span className="text-xs font-semibold uppercase text-neutral-600">Version B</span>
                    <DsSelect value={audienceB} onChange={setAudienceB} options={AUDIENCES.filter((a) => a !== audience).map((a) => ({ value: a, label: a }))} />
                    <div className="mt-1 flex items-center justify-between text-xs text-neutral-600">
                      <span>{formatFollowers(Math.round(resultsB / 2))} {obj.resultLabel.toLowerCase()}</span>
                      <span className="font-semibold">{cprB.toFixed(1)} SAR each</span>
                    </div>
                    <span className="text-[11px] text-neutral-400">{Math.round(budget / 2).toLocaleString()} SAR</span>
                  </div>
                </div>
                <p className="flex items-center justify-center gap-1.5 rounded-lg bg-warnings-successBg p-2 text-center text-xs font-medium text-warnings-success">
                  <Award size={13} /> Likely winner: Version {abWinner} — {abWinner === 'A' ? audience : audienceB} (cheaper per result)
                </p>
              </>
            )}
          </DemoCard>
        </div>

        {/* Predicted + summary (sticky on desktop) */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-4 lg:self-start">
          <DemoCard className="flex flex-col gap-4">
            <SectionTitle title="Predicted results" subtitle="Live estimate" />
            <div className="rounded-xl bg-[linear-gradient(135deg,#EEF2FF,#FFFFFF)] p-4">
              <p className="text-xs font-medium uppercase text-neutral-500">{obj.resultLabel}</p>
              <p className="font-Sora text-3xl font-semibold text-primary-800">{formatFollowers(Math.round(results * 0.8))}–{formatFollowers(Math.round(results * 1.2))}</p>
              <p className="mt-1 text-xs text-neutral-500">≈ {costPerResult > 0 ? `${(costPerResult * 0.8).toFixed(1)}–${(costPerResult * 1.4).toFixed(1)} SAR each` : '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Pred icon={Eye} label="Added reach" value={`+${formatFollowers(reach)}`} />
              <Pred icon={MousePointerClick} label="Link clicks" value={formatFollowers(clicks)} />
              <Pred icon={TrendingUp} label="Daily reach" value={formatFollowers(Math.round(reach / days))} />
              <Pred icon={Award} label="Organic reach" value={organicReach ? formatFollowers(organicReach) : '—'} />
            </div>
            {organicReach > 0 && <p className="text-xs text-neutral-500">Lifts this post from <span className="font-medium">{formatFollowers(organicReach)}</span> to ~<span className="font-medium text-primary-800">{formatFollowers(organicReach + reach)}</span> total.</p>}
            <p className="text-[11px] text-neutral-400">Estimated from {formatFollowers(impressions)} impressions at ~{CPM} SAR CPM (blended FB/IG, KSA). Real results vary with audience &amp; creative.</p>
          </DemoCard>
          <DemoCard className="flex flex-col gap-3">
            <SectionTitle title="Campaign summary" />
            {post && <p className="rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700">{post.content}</p>}
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Objective" value={obj.label} /><Row label="Budget" value={`${budget.toLocaleString()} SAR`} /><Row label="Duration" value={`${days} days`} /><Row label="Platforms" value={`${platforms.length} selected`} /><Row label="Audience" value={audience} />
            </div>
            <Button variant="primary" size="medium" disable={platforms.length === 0 || !post} onClick={() => { setResult(null); setConfirmOpen(true); }}>Launch promotion</Button>
            <p className="text-center text-[11px] text-neutral-400">Creates a paused boost in your Meta Ad Account — you activate it in Ads Manager.</p>
          </DemoCard>
        </div>
      </div>

      {/* Active boosts tracker */}
      {boosts.length > 0 && (
        <DemoCard>
          <SectionTitle title="Active boosts" subtitle="Launched campaigns — paused until you activate them in Ads Manager" />
          <div className="mt-4 flex flex-col divide-y divide-neutral-200">
            {boosts.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-3">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase', b.status === 'running' ? 'bg-warnings-successBg text-warnings-success' : 'bg-secondary-200 text-primary-900')}>{b.status}</span>
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-800">{b.content || '(post)'}</p>
                <span className="hidden text-xs text-neutral-500 md:block">{OBJECTIVES.find((o) => o.key === b.objective)?.label}</span>
                <span className="text-xs text-neutral-500">{b.budget.toLocaleString()} SAR · {b.days}d · from {b.startDate}</span>
                <div className="flex items-center gap-0.5">{b.platforms.map((pl) => <PlatformChip key={pl} platform={pl as TPlatformId} />)}</div>
                <button onClick={() => saveBoosts(boosts.filter((x) => x.id !== b.id))} title="Remove" className="text-neutral-400 hover:text-text-red"><X size={14} /></button>
              </div>
            ))}
          </div>
        </DemoCard>
      )}

      {/* Full-screen "AI is thinking" glow */}
      <AnimatePresence>
        {thinking && (
          <>
            <ScreenGlow />
            <motion.div className="fixed inset-0 z-[56] flex items-center justify-center bg-white/20 backdrop-blur-[1px]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl border border-indigo-100 bg-white/80 px-10 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.55)] backdrop-blur-md">
                <AiThinking />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Launch / confirm-spend modal — real boost via the Marketing API */}
      <AnimatePresence>
        {confirmOpen && (
          <Backdrop onClose={() => !launching && setConfirmOpen(false)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-7">
              {!result ? (
                <>
                  <div className="flex items-start justify-between">
                    <SectionTitle title="Review & launch boost" subtitle="Confirm the spend before it goes to Meta." />
                    <button onClick={() => setConfirmOpen(false)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 text-sm">
                    <Row label="Post" value={post ? `${post.content.slice(0, 36)}…` : '—'} />
                    <Row label="Objective" value={obj.label} />
                    <Row label="Budget" value={`${budget.toLocaleString()} SAR · ${dailyBudget.toLocaleString()}/day`} />
                    <Row label="Duration" value={`${days} days`} />
                    <Row label="Platforms" value={platforms.map((p) => getPlatform(p).name).join(', ') || '—'} />
                    <Row label="Est. reach" value={`+${formatFollowers(reach)}`} />
                  </div>
                  <p className="mt-3 rounded-lg bg-secondary-200/60 p-3 text-xs text-primary-900">Creates the campaign <span className="font-semibold">paused</span> in your Meta Ad Account — nothing is charged until you activate it in Ads Manager.</p>
                  <div className="mt-5 flex gap-3">
                    <Button variant="outline" size="medium" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button variant="primary" size="medium" disable={launching} onClick={launch}>{launching ? 'Creating…' : 'Confirm & create boost'}</Button>
                  </div>
                </>
              ) : result.ok ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warnings-successBg text-warnings-success"><CheckCircle2 size={24} /></span>
                  <SectionTitle title="Boost created — paused" subtitle={result.message} />
                  {result.adsManagerUrl && <a href={result.adsManagerUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Open in Ads Manager →</a>}
                  <button onClick={() => { setConfirmOpen(false); setResult(null); }} className="text-sm text-neutral-500 hover:text-neutral-800">Close</button>
                </div>
              ) : result.needsSetup ? (
                <div className="flex flex-col gap-3">
                  <SectionTitle title="Real boosting isn’t connected yet" subtitle={result.message} />
                  <p className="text-xs font-medium uppercase text-neutral-500">To boost with real money you need:</p>
                  <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-neutral-700">
                    {(result.requirements ?? []).map((r, i) => <li key={i}>{r}</li>)}
                  </ol>
                  <a href="https://www.facebook.com/business/help/714656935225188" target="_blank" rel="noreferrer" className="text-sm font-medium text-primary-800 hover:underline">How to set up a Meta Ad Account →</a>
                  <Button variant="outline" size="medium" onClick={() => { setConfirmOpen(false); setResult(null); }}>Close</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <SectionTitle title="Couldn’t create the boost" subtitle={result.message} />
                  <Button variant="outline" size="medium" onClick={() => setResult(null)}>Back</Button>
                </div>
              )}
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>

      {/* AI plan modal */}
      <AnimatePresence>
        {aiOpen && (
          <Backdrop onClose={() => !thinking && setAiOpen(false)} className="items-center justify-center p-4">
            <ModalPanel className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-7">
              {thinking ? (
                <div className="p-6"><AiThinking /></div>
              ) : (
                <>
                  <div className="flex items-start justify-between p-6 pb-3">
                    <SectionTitle title="Plan with AI" subtitle="Answer a few questions and AI will build the campaign." />
                    <button onClick={() => setAiOpen(false)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
                  </div>
                  {/* mini stepper */}
                  <div className="flex items-center gap-2 px-6">
                    {Q.map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', i <= mStep ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-500')}>{i + 1}</span>
                        <span className={cn('text-xs', i === mStep ? 'font-semibold text-text-dark' : 'text-neutral-500')}>{s}</span>
                        {i < Q.length - 1 && <span className="mx-1 h-px w-4 bg-neutral-300" />}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex-1 overflow-y-auto px-6">
                    {mStep === 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-text-dark"><FileText size={14} /> Which post should we boost?</p>
                        {topPost && (
                          <button onClick={() => setMPost(topPost.p.id)} className={cn('rounded-lg border p-3 text-left text-sm', mPost === topPost.p.id ? 'border-primary-400 bg-primary-100' : 'border-indigo-100 bg-[linear-gradient(135deg,#F5F3FF,#FFFFFF)]')}>
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600"><Sparkles size={11} /> AI pick</span>
                            <span className="mt-0.5 block truncate text-neutral-800">{topPost.p.content}</span>
                          </button>
                        )}
                        {promotable.filter((p) => p.id !== topPost?.p.id).map((p) => (
                          <button key={p.id} onClick={() => setMPost(p.id)} className={cn('truncate rounded-lg border p-2.5 text-left text-sm', mPost === p.id ? 'border-primary-300 bg-secondary-200' : 'border-neutral-200 hover:bg-neutral-100')}>{p.content}</button>
                        ))}
                      </div>
                    )}
                    {mStep === 1 && (
                      <div className="flex flex-col gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-text-dark"><Target size={14} /> What's your goal?</p>
                        {OBJECTIVES.map((o) => (
                          <button key={o.key} onClick={() => setMObj(o.key)} className={cn('flex items-center gap-2 rounded-lg border p-3 text-left text-sm', mObj === o.key ? 'border-primary-400 bg-primary-100' : 'border-neutral-200 hover:bg-neutral-100')}>
                            <o.icon size={16} className="text-primary-800" /> {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {mStep === 2 && (
                      <div className="flex flex-col gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-text-dark"><Users size={14} /> Who should we reach?</p>
                        <div className="flex flex-wrap gap-2">
                          {AUDIENCES.map((aud) => (
                            <button key={aud} onClick={() => setMAud(aud)} className={cn('rounded-full border px-3 py-1.5 text-sm', mAud === aud ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 hover:bg-neutral-100')}>{aud}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-neutral-200 p-6 pt-4">
                    <Button variant="outline" size="medium" className="!w-24" disable={mStep === 0} onClick={() => setMStep((s) => Math.max(0, s - 1))} leftIcon={<ArrowLeft size={15} />}>Back</Button>
                    {mStep < 2 ? <Button variant="primary" size="medium" className="!w-24" onClick={() => setMStep((s) => s + 1)} rightIcon={<ArrowRight size={15} />}>Next</Button>
                      : <div className="w-44"><AiButton onClick={generatePlan}>Build my plan</AiButton></div>}
                  </div>
                </>
              )}
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-neutral-200 pb-2"><span className="text-neutral-600">{label}</span><span className="font-medium text-neutral-800">{value}</span></div>
);
const Pred = ({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) => (
  <div className="rounded-lg border border-neutral-200 p-3"><p className="flex items-center gap-1.5 text-xs text-neutral-500"><Icon size={13} /> {label}</p><p className="mt-1 font-Sora text-lg font-semibold text-text-dark">{value}</p></div>
);
