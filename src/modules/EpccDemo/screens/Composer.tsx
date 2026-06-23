import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Sparkles, ImagePlus, Wand2, X, Upload, AlertTriangle, Hash, Search, ArrowLeft, ArrowRight,
  Link2, MessageSquare, Copy, Square, Film, CircleDashed, Video, Check, SlidersHorizontal, CalendarClock, Clapperboard,
} from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { DemoCard, SectionTitle, PlatformChip, formatFollowers } from '../_components/ui';
import { DsField, DsTextarea, DsSelect, DsDatePicker, DsTimePicker } from '../_components/form';
import ImageGenLoader from '../_components/ImageGenLoader';
import AiButton from '../_components/AiButton';
import PreviewCarousel from '../_components/PreviewCarousel';
import { PLATFORMS, getPlatform, TPlatformId } from '@/mock-server/platforms';
import { ACCOUNTS } from '@/mock-server/accounts';
import { IPost, FORMAT_SUPPORT, PLATFORM_FIELDS, TPostFormat } from '@/mock-server/posts';
import { SUGGESTED_SLOTS } from '@/mock-server/besttime';
import { newPostId } from '@/mock-server/posts-store';
import { generatePost, generateImage, generateVideo, generateMeta, hasOpenAIKey } from '../_services/openai';
import { useConnectedPlatforms } from '../_services/useConnectedPlatforms';

type TSaveAction = 'draft' | 'schedule' | 'publish';
const LIMITS: Record<TPlatformId, number> = { x: 280, instagram: 2200, facebook: 5000, linkedin: 3000, tiktok: 2200, snapchat: 250 };
const FORMATS: { id: TPostFormat; label: string; Icon: typeof Square; hint: string }[] = [
  { id: 'post', label: 'Post', Icon: Square, hint: 'Standard feed post' },
  { id: 'reel', label: 'Reel', Icon: Film, hint: 'Short vertical video' },
  { id: 'story', label: 'Story', Icon: CircleDashed, hint: 'Full-screen ephemeral' },
  { id: 'video', label: 'Video', Icon: Video, hint: 'In-feed video' },
];
const STEPS = ['Setup', 'Content', 'Customize', 'Schedule'];

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', on ? 'bg-primary-800' : 'bg-neutral-300')}>
    <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
  </button>
);

export default function Composer({
  initial, initialDate, onSave, onCancel,
}: { initial?: IPost; initialDate?: string; onSave?: (post: IPost, action: TSaveAction) => void | Promise<void>; onCancel?: () => void }) {
  const isEdit = Boolean(initial);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState('Eastern Province Investment Forum 2026 — registration open');
  const [content, setContent] = useState(initial?.content ?? '');
  const [format, setFormat] = useState<TPostFormat>(initial?.format ?? 'post');
  const [imagePrompt, setImagePrompt] = useState('Modern Dammam skyline at golden hour, business event banner');
  const [image, setImage] = useState<string | undefined>();
  const [isVideo, setIsVideo] = useState(false);
  const { connected } = useConnectedPlatforms();
  const [selected, setSelected] = useState<TPlatformId[]>(initial?.platforms ?? []);
  const [date, setDate] = useState(initial?.date ?? initialDate ?? '2026-06-25');
  const [time, setTime] = useState(initial?.time ?? '09:00');
  const [mode, setMode] = useState<'now' | 'schedule'>(initial?.status === 'scheduled' ? 'schedule' : 'now');

  const [tags, setTags] = useState<string[]>(['EPChamber', 'Vision2030']);
  const [tagInput, setTagInput] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [link, setLink] = useState('');
  const [perPlatform, setPerPlatform] = useState<Partial<Record<TPlatformId, string>>>({});
  const [meta, setMeta] = useState<Record<string, Record<string, string | boolean>>>({});

  const [genText, setGenText] = useState(false);
  const [genImg, setGenImg] = useState(false);
  const [genVid, setGenVid] = useState(false);
  const [genMeta, setGenMeta] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);

  // Upload the file to public hosting (Vercel Blob) so Instagram can fetch it and
  // Facebook gets a reliable URL. Falls back to a local data URL if hosting is off
  // (Facebook still works via byte upload; Instagram needs the public URL).
  const onDrop = async (files: File[]) => {
    const file = files[0]; if (!file) return;
    const vid = file.type.startsWith('video');
    setIsVideo(vid);
    setUploading(true);
    setNote(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await res.json();
      if (res.ok && j.url) {
        setImage(j.url);
        setNote({ kind: 'ok', text: vid ? 'Video uploaded' : 'Image uploaded' });
      } else {
        // Fallback: local data URL (works for Facebook, not Instagram).
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result as string);
        reader.readAsDataURL(file);
        setNote({ kind: 'warn', text: `${j.error || 'Hosting unavailable'} — Instagram needs a hosted image.` });
      }
    } catch (e) {
      setNote({ kind: 'warn', text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [], 'video/*': [] }, multiple: false });

  const toggle = (id: TPlatformId) => setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const addTag = () => { const t = tagInput.trim().replace(/^#/, ''); if (t && !tags.includes(t)) setTags((p) => [...p, t]); setTagInput(''); };
  const setMetaVal = (p: TPlatformId, id: string, v: string | boolean) =>
    setMeta((m) => ({ ...m, [p]: { ...(m[p] ?? {}), [id]: v } }));

  const runGenerateText = async () => { setGenText(true); const r = await generatePost(brief, selected[0]); setContent(r.text); setNote(r.source === 'openai' ? { kind: 'ok', text: 'Post generated with OpenAI' } : { kind: 'warn', text: `Sample text — ${r.error ?? 'AI unavailable'}` }); setGenText(false); };
  const runGenerateImage = async () => { setGenImg(true); const r = await generateImage(imagePrompt); setImage(r.url); setIsVideo(false); if (!altText) setAltText(imagePrompt); setNote(r.source === 'openai' ? { kind: 'ok', text: 'Image generated with gpt-image-1' } : { kind: 'warn', text: `Sample image — ${r.error ?? 'AI unavailable'}` }); setGenImg(false); };
  const runGenerateVideo = async () => { setGenVid(true); const r = await generateVideo(imagePrompt, format === 'reel' || format === 'story'); setImage(r.url); setIsVideo(true); setNote(r.source === 'openai' ? { kind: 'ok', text: 'Video generated with Sora' } : { kind: 'warn', text: `Sample video — ${r.error ?? 'AI unavailable'}` }); setGenVid(false); };
  const runGenerateMeta = async () => { setGenMeta(true); const r = await generateMeta(content || brief); setTags(r.tags); setSeoTitle(r.seoTitle); if (!altText) setAltText(r.altText); setNote(r.source === 'openai' ? { kind: 'ok', text: 'Tags & SEO generated' } : { kind: 'warn', text: `Sample tags — ${r.error ?? 'AI unavailable'}` }); setGenMeta(false); };

  const [busy, setBusy] = useState<TSaveAction | null>(null);

  const buildPost = (status: IPost['status']): IPost => ({
    ...(initial ?? { id: '', type: 'post' as const }),
    id: initial?.id ?? newPostId(), content: content.trim(), platforms: selected, date, time,
    type: initial?.type ?? 'post', format, status,
    ...(image ? (isVideo ? { video: image } : { media: [image] }) : {}),
  });
  const save = async (action: TSaveAction) => {
    if (busy) return;
    const status: IPost['status'] = action === 'publish' ? 'published' : action === 'schedule' ? 'scheduled' : 'draft';
    setBusy(action);
    try {
      await onSave?.(buildPost(status), action);
    } finally {
      setBusy(null);
    }
  };
  const anyBusy = busy !== null;

  const slug = (brief || 'epcc').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 18).replace(/(^-|-$)/g, '');
  const trackedLink = link ? `chamber.co/ep-${(content.length * 7 + 13).toString(36)}?utm_source=epchamber&utm_medium=social&utm_campaign=${slug}` : '';
  const canSave = content.trim().length > 0 && selected.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header + stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onCancel && <button onClick={onCancel} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100"><ArrowLeft size={16} /></button>}
          <SectionTitle title={isEdit ? 'Edit post' : 'Create post'} subtitle="A guided flow — fewer fields per step." />
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', hasOpenAIKey() ? 'bg-warnings-successBg text-warnings-success' : 'bg-neutral-100 text-neutral-600')}>{hasOpenAIKey() ? '● OpenAI connected' : '○ Sample mode'}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className="flex items-center gap-2">
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              i < step ? 'bg-primary-800 text-white' : i === step ? 'bg-primary-800 text-white ring-4 ring-primary-200' : 'bg-neutral-200 text-neutral-500')}>
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <span className={cn('text-sm', i === step ? 'font-semibold text-text-dark' : 'text-neutral-500')}>{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-neutral-300" />}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Editor */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          {/* STEP 0 — Setup */}
          {step === 0 && (
            <>
              <DemoCard className="flex flex-col gap-3">
                <div>
                  <span className="text-sm font-semibold text-text-dark">Choose a content format</span>
                  <p className="text-xs text-neutral-500">Each format is rendered natively per platform.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {FORMATS.map((f) => {
                    const active = format === f.id;
                    return (
                      <button key={f.id} onClick={() => setFormat(f.id)}
                        className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition-all', active ? 'border-primary-400 bg-primary-100 ring-2 ring-primary-200' : 'border-neutral-200 hover:bg-neutral-100')}>
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary-800 text-white' : 'bg-neutral-100 text-neutral-600')}><f.Icon size={20} /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between"><span className="font-medium text-text-dark">{f.label}</span>{active && <Check size={16} className="text-primary-800" />}</div>
                          <p className="text-xs text-neutral-500">{f.hint}</p>
                          <div className="mt-2 flex flex-wrap gap-1">{FORMAT_SUPPORT[f.id].map((pl) => <PlatformChip key={pl} platform={pl} />)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DemoCard>

              <DemoCard className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-text-dark">Target platforms</span>
                    <p className="text-xs text-neutral-500">{connected.length === 0 ? 'No accounts connected yet' : `${selected.length} of ${connected.length} connected selected`}</p>
                  </div>
                  {connected.length > 0 && (
                    <button onClick={() => setSelected(selected.length === connected.length ? [] : [...connected])} className="text-xs font-medium text-primary-800 hover:underline">{selected.length === connected.length ? 'Clear all' : 'Select all'}</button>
                  )}
                </div>

                {connected.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-lg bg-neutral-100 py-8 text-center">
                    <p className="text-sm text-neutral-600">You haven’t connected any accounts yet.</p>
                    <a href="/epcc-demo/accounts" className="rounded-lg bg-primary-800 px-4 py-2 text-sm font-medium text-white hover:bg-primary-900">Connect an account →</a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {PLATFORMS.map((p) => {
                      const isConnected = connected.includes(p.id);
                      const on = selected.includes(p.id);
                      const feedOnly = format !== 'post' && !FORMAT_SUPPORT[format].includes(p.id);
                      return (
                        <button key={p.id} disabled={!isConnected} onClick={() => isConnected && toggle(p.id)}
                          className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                            !isConnected ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-60' : on ? 'border-primary-400 bg-primary-100' : 'border-neutral-200 hover:bg-neutral-100')}>
                          <PlatformChip platform={p.id} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-text-dark">{p.name}</p>
                            <p className="truncate text-xs text-neutral-500">{isConnected ? 'Connected' : 'Not connected'}</p>
                          </div>
                          {isConnected && feedOnly && <span className="shrink-0 rounded-full bg-warnings-cautionBg px-2 py-0.5 text-[10px] font-medium text-warnings-caution">feed only</span>}
                          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-primary-800 bg-primary-800 text-white' : 'border-neutral-300')}>{on && <Check size={12} />}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </DemoCard>
            </>
          )}

          {/* STEP 1 — Content */}
          {step === 1 && (
            <>
              <DemoCard className="flex flex-col gap-4">
                <div className="flex items-center gap-2"><Sparkles size={16} className="text-primary-800" /><span className="text-sm font-semibold text-text-dark">AI writer</span></div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <DsField label="Brief" value={brief} onChange={setBrief} placeholder="Topic, event or goal…" className="flex-1" />
                  <div className="sm:w-40"><AiButton loading={genText} onClick={runGenerateText}>Generate post</AiButton></div>
                </div>
                <DsTextarea label="Post content" value={content} onChange={setContent} maxLength={500} placeholder="Write your post, or generate it with AI above…" />
                {note && <div className={cn('flex items-center gap-2 rounded-lg p-2.5 text-xs font-medium', note.kind === 'ok' ? 'bg-warnings-successBg text-warnings-success' : 'bg-warnings-cautionBg text-warnings-caution')}>{note.kind === 'warn' && <AlertTriangle size={14} />}{note.text}</div>}
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selected.map((p) => { const len = content.length; const lim = LIMITS[p]; const over = len > lim;
                      return <span key={p} className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', over ? 'bg-text-red/10 text-text-red' : len > lim * 0.9 ? 'bg-warnings-cautionBg text-warnings-caution' : 'bg-neutral-100 text-neutral-600')}><PlatformChip platform={p} /> {len}/{lim}</span>; })}
                  </div>
                )}
              </DemoCard>

              <DemoCard className="flex flex-col gap-3">
                <div className="flex items-center gap-2"><ImagePlus size={16} className="text-primary-800" /><span className="text-sm font-semibold text-text-dark">Media</span></div>
                {uploading ? <ImageGenLoader kind={isVideo ? 'video' : 'image'} hint="Uploading to hosting…" /> : genImg || genVid ? <ImageGenLoader kind={genVid ? 'video' : 'image'} hint={genVid ? 'AI video (Sora) can take up to a minute…' : undefined} /> : image ? (
                  <div className="relative overflow-hidden rounded-lg border border-neutral-200">
                    {isVideo ? <video src={image} className="max-h-64 w-full object-cover" muted loop autoPlay playsInline controls /> : <img src={image} alt={altText} className="max-h-64 w-full object-cover" />}
                    <button onClick={() => { setImage(undefined); setIsVideo(false); }} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"><X size={15} /></button>
                  </div>
                ) : (
                  <div {...getRootProps()} className={cn('flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors', isDragActive ? 'border-primary-400 bg-primary-100' : 'border-neutral-300 hover:bg-neutral-100')}>
                    <input {...getInputProps()} /><Upload size={22} className="text-neutral-400" />
                    <p className="mt-2 text-sm text-neutral-600">Drag an image or video here, or click to upload</p>
                    <p className="text-xs text-neutral-400">{format === 'reel' || format === 'story' ? 'Vertical video recommended' : 'Image or video'}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2 rounded-lg bg-primary-100 p-3">
                  <DsField label="Generate media with AI" value={imagePrompt} onChange={setImagePrompt} placeholder="Describe an image or video…" />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <AiButton loading={genImg} disabled={genVid} onClick={runGenerateImage} icon={<Wand2 size={16} />}>{genImg ? 'Generating…' : 'Generate image'}</AiButton>
                    <AiButton loading={genVid} disabled={genImg} onClick={runGenerateVideo} icon={<Clapperboard size={16} />}>{genVid ? 'Rendering…' : 'Generate video'}</AiButton>
                  </div>
                </div>
              </DemoCard>

              <DemoCard className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><Hash size={16} className="text-primary-800" /> Tags & SEO</span>
                  <div className="w-40"><AiButton size="sm" loading={genMeta} onClick={runGenerateMeta}>{genMeta ? 'Generating…' : 'Generate with AI'}</AiButton></div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-800">Hashtags</label>
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 p-2 shadow-6">
                    {tags.map((t) => <span key={t} className="flex items-center gap-1 rounded-full bg-secondary-200 px-2.5 py-1 text-xs font-medium text-primary-900">#{t}<button onClick={() => setTags((p) => p.filter((x) => x !== t))}><X size={11} /></button></span>)}
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} placeholder="Add a tag and press Enter" className="min-w-[140px] flex-1 text-sm outline-none" />
                  </div>
                </div>
                <DsField label="SEO title" value={seoTitle} onChange={setSeoTitle} placeholder="Headline for link previews / search" leftIcon={<Search size={14} />} />
                <DsField label="Destination link" value={link} onChange={setLink} placeholder="https://epchamber.sa/forum-2026" leftIcon={<Link2 size={14} />} />
                {trackedLink && <div className="flex items-center justify-between gap-2 rounded-lg bg-neutral-100 p-2.5"><div className="min-w-0"><p className="text-[11px] font-medium uppercase text-neutral-500">Tracked link</p><p className="truncate text-sm font-medium text-primary-800">{trackedLink}</p></div><Copy size={15} className="shrink-0 text-neutral-400" /></div>}
              </DemoCard>
            </>
          )}

          {/* STEP 2 — Customize per platform */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="flex items-center gap-2 text-sm text-neutral-600"><SlidersHorizontal size={15} className="text-primary-800" /> Tailor the caption and native options for each network.</p>
              {selected.length === 0 && <DemoCard className="py-8 text-center text-sm text-neutral-500">Select platforms in step 1 first.</DemoCard>}
              {selected.map((p) => (
                <DemoCard key={p} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2"><PlatformChip platform={p} size="md" /><span className="text-sm font-semibold text-text-dark">{getPlatform(p).name}</span></div>
                  <DsTextarea label="Caption" value={perPlatform[p] ?? content} onChange={(v) => setPerPlatform((prev) => ({ ...prev, [p]: v }))} rows={3} maxLength={LIMITS[p]} placeholder={`Caption for ${getPlatform(p).name}…`} />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PLATFORM_FIELDS[p].map((f) => {
                      const val = meta[p]?.[f.id];
                      if (f.type === 'toggle') return (
                        <div key={f.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5"><span className="text-sm text-neutral-700">{f.label}</span><Toggle on={Boolean(val)} onClick={() => setMetaVal(p, f.id, !val)} /></div>
                      );
                      if (f.type === 'select') return <DsSelect key={f.id} label={f.label} value={(val as string) ?? f.options![0]} onChange={(v) => setMetaVal(p, f.id, v)} options={f.options!.map((o) => ({ value: o, label: o }))} />;
                      return <DsField key={f.id} label={f.label} value={(val as string) ?? ''} onChange={(v) => setMetaVal(p, f.id, v)} placeholder={f.placeholder} />;
                    })}
                  </div>
                </DemoCard>
              ))}
            </div>
          )}

          {/* STEP 3 — Publish or schedule */}
          {step === 3 && (
            <DemoCard className="flex flex-col gap-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-dark"><CalendarClock size={16} className="text-primary-800" /> Publishing</span>

              {/* Toggle: publish now vs schedule for later */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
                {(['now', 'schedule'] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn('rounded-lg py-2 text-sm font-medium transition-colors', mode === m ? 'bg-white text-primary-900 shadow-4' : 'text-neutral-600 hover:text-neutral-800')}>
                    {m === 'now' ? 'Publish now' : 'Schedule for later'}
                  </button>
                ))}
              </div>

              {mode === 'schedule' && (
                <>
                  <div className="grid grid-cols-2 gap-4"><DsDatePicker label="Date" value={date} onChange={setDate} /><DsTimePicker label="Time" value={time} onChange={setTime} /></div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-600"><Sparkles size={13} className="text-primary-800" /> Suggested times</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SUGGESTED_SLOTS.map((s) => { const on = date === s.date && time === s.time;
                        return <button key={s.label} onClick={() => { setDate(s.date); setTime(s.time); }} title={s.reason} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors', on ? 'border-primary-300 bg-secondary-200 text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>{s.label}<span className="rounded-full bg-warnings-successBg px-1.5 text-[10px] font-medium text-warnings-success">{s.score}</span></button>; })}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">Scheduled posts are sent to the platform now and go live at the chosen time (Facebook requires at least ~10 minutes ahead).</p>
                </>
              )}

              <div className="flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
                <div className="w-36"><Button variant="outline" size="medium" loading={busy === 'draft'} disable={!canSave || anyBusy} onClick={() => save('draft')}>Save draft</Button></div>
                {mode === 'schedule' ? (
                  <div className="w-44"><Button variant="primary" size="medium" loading={busy === 'schedule'} disable={!canSave || anyBusy} onClick={() => save('schedule')}>{busy === 'schedule' ? 'Scheduling…' : 'Schedule post'}</Button></div>
                ) : (
                  <div className="w-40"><Button variant="primary" size="medium" loading={busy === 'publish'} disable={!canSave || anyBusy} onClick={() => save('publish')}>{busy === 'publish' ? 'Publishing…' : 'Publish now'}</Button></div>
                )}
              </div>
              {(busy === 'publish' || busy === 'schedule') && <p className="flex items-center gap-2 text-xs text-neutral-500"><Sparkles size={13} className="text-primary-800" /> Sending to your connected accounts — this can take a few seconds for images.</p>}
            </DemoCard>
          )}

          {/* Step nav */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="medium" className="!w-28" disable={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            {step < STEPS.length - 1
              ? <Button variant="primary" size="medium" className="!w-28" onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} rightIcon={<ArrowRight size={16} />}>Next</Button>
              : <span className="flex items-center gap-1.5 text-xs text-neutral-500"><MessageSquare size={13} /> Review the preview, then publish.</span>}
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-0 flex flex-col gap-4">
            <SectionTitle title="Live preview" subtitle="Swipe between platforms" />
            <PreviewCarousel platforms={selected} content={content} image={image} isVideo={isVideo} format={format} tags={tags} contentByPlatform={perPlatform} />
          </div>
        </div>
      </div>
    </div>
  );
}
