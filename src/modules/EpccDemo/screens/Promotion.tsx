'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { Eye, MousePointerClick, Target, CalendarRange, TrendingUp, CheckCircle2, Award, Users, Sparkles, ArrowLeft, ArrowRight, X, FileText } from 'lucide-react';
import { DemoCard, SectionTitle, PlatformChip, formatFollowers } from '../_components/ui';
import { DsSelect } from '../_components/form';
import AiButton from '../_components/AiButton';
import AiThinking from '../_components/AiThinking';
import ScreenGlow from '../_components/ScreenGlow';
import { Backdrop, ModalPanel } from '../_components/motion';
import { getPlatform, TPlatformId } from '@/mock-server/platforms';
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
  const [platforms, setPlatforms] = useState<TPlatformId[]>(promotable.find((p) => p.id === initialPostId)?.platforms ?? []);
  const [aiNote, setAiNote] = useState('');
  const [launched, setLaunched] = useState(false);

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

  const selectPost = (id: string) => { setPostId(id); setPlatforms(promotable.find((p) => p.id === id)?.platforms ?? []); };
  const togglePlatform = (id: TPlatformId) => setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const reach = Math.round(budget * Math.max(1, platforms.length) * 4.2);
  const clicks = Math.round(reach * obj.ctr);
  const results = obj.conv > 0 ? Math.round(clicks * obj.conv) : clicks;
  const costPerResult = results > 0 ? budget / results : 0;

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
                <label className="text-sm font-medium text-neutral-800">Budget: <span className="text-primary-800">{budget.toLocaleString()} SAR</span></label>
                <input type="range" min={1000} max={50000} step={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="mt-3 w-full accent-primary-800" />
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
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-800"><Users size={14} /> Target audience</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {AUDIENCES.map((aud) => (
                  <button key={aud} onClick={() => setAudience(aud)} className={cn('rounded-full border px-3 py-1.5 text-sm', audience === aud ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
                    {aud}{obj.audience === aud && <span title={`AI recommends targeting ${aud} for ${obj.label}`} className="ml-1 text-[10px] font-medium text-warnings-success">AI ✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </DemoCard>
        </div>

        {/* Predicted + summary */}
        <div className="flex flex-col gap-6">
          <DemoCard className="flex flex-col gap-4">
            <SectionTitle title="Predicted results" subtitle="Live estimate" />
            <div className="rounded-xl bg-[linear-gradient(135deg,#EEF2FF,#FFFFFF)] p-4">
              <p className="text-xs font-medium uppercase text-neutral-500">{obj.resultLabel}</p>
              <p className="font-Sora text-3xl font-semibold text-primary-800">{formatFollowers(results)}</p>
              <p className="mt-1 text-xs text-neutral-500">≈ {costPerResult > 0 ? `${costPerResult.toFixed(1)} SAR each` : '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Pred icon={Eye} label="Added reach" value={`+${formatFollowers(reach)}`} />
              <Pred icon={MousePointerClick} label="Link clicks" value={formatFollowers(clicks)} />
              <Pred icon={TrendingUp} label="Daily reach" value={formatFollowers(Math.round(reach / days))} />
              <Pred icon={Award} label="Organic reach" value={organicReach ? formatFollowers(organicReach) : '—'} />
            </div>
            {organicReach > 0 && <p className="text-xs text-neutral-500">Lifts this post from <span className="font-medium">{formatFollowers(organicReach)}</span> to ~<span className="font-medium text-primary-800">{formatFollowers(organicReach + reach)}</span> total.</p>}
          </DemoCard>
          <DemoCard className="flex flex-col gap-3">
            <SectionTitle title="Campaign summary" />
            {post && <p className="rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700">{post.content}</p>}
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Objective" value={obj.label} /><Row label="Budget" value={`${budget.toLocaleString()} SAR`} /><Row label="Duration" value={`${days} days`} /><Row label="Platforms" value={`${platforms.length} selected`} /><Row label="Audience" value={audience} />
            </div>
            <Button variant="primary" size="medium" disable={platforms.length === 0} onClick={() => setLaunched(true)}>Launch promotion</Button>
            {launched && <p className="rounded-lg bg-warnings-successBg p-3 text-center text-sm font-medium text-warnings-success"><CheckCircle2 size={14} className="mr-1 inline" /> Launched (demo). {budget.toLocaleString()} SAR processed.</p>}
          </DemoCard>
        </div>
      </div>

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

      {/* AI plan modal */}
      <AnimatePresence>
        {aiOpen && (
          <Backdrop onClose={() => !thinking && setAiOpen(false)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-7">
              {thinking ? (
                <AiThinking />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <SectionTitle title="Plan with AI" subtitle="Answer a few questions and AI will build the campaign." />
                    <button onClick={() => setAiOpen(false)} className="text-neutral-400 hover:text-neutral-700"><X size={20} /></button>
                  </div>
                  {/* mini stepper */}
                  <div className="mt-4 flex items-center gap-2">
                    {Q.map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', i <= mStep ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-500')}>{i + 1}</span>
                        <span className={cn('text-xs', i === mStep ? 'font-semibold text-text-dark' : 'text-neutral-500')}>{s}</span>
                        {i < Q.length - 1 && <span className="mx-1 h-px w-4 bg-neutral-300" />}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
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

                  <div className="mt-6 flex items-center justify-between">
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
