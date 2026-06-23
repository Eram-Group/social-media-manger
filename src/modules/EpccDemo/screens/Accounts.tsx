'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Trash2, Check, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { Backdrop, ModalPanel } from '../_components/motion';
import { DemoCard, SectionTitle, PlatformChip, StatCard, formatFollowers } from '../_components/ui';
import { PLATFORMS, getPlatform, TPlatformId } from '@/mock-server/platforms';

const CONNECTABLE: TPlatformId[] = ['facebook', 'instagram'];

interface ConnectedAccount {
  platform: TPlatformId;
  accountId: string;
  name?: string;
  followers?: number;
}

const errorText = (code: string | null) => {
  if (!code) return '';
  if (code === 'no_pages') return 'No Facebook Pages found — make sure you administer at least one Page.';
  if (code === 'no_ig_account') return 'No Instagram Business account is linked to your Page. Link one and retry.';
  return decodeURIComponent(code);
};

export default function Accounts() {
  const params = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ConnectedAccount | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | TPlatformId>('all');
  const [metrics, setMetrics] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts', { cache: 'no-store' });
      setAccounts((await res.json()).accounts ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
    // Real derived metrics (followers, engagement, avg likes/comments, demographics).
    fetch('/api/metrics', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .catch(() => setMetrics(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) setBanner({ tone: 'success', text: `${getPlatform(connected as TPlatformId).name} connected successfully ✓` });
    else if (error) setBanner({ tone: 'error', text: errorText(error) });
  }, [params]);

  const connect = (platform: TPlatformId) => { window.location.href = `/api/connect/${platform}`; };
  const remove = async (a: ConnectedAccount) => {
    setBusy(a.accountId);
    await fetch(`/api/accounts?platform=${a.platform}&accountId=${a.accountId}`, { method: 'DELETE' });
    setBusy(null);
    setConfirmRemove(null);
    load();
  };

  const byPlatform = (p: TPlatformId) => accounts.find((a) => a.platform === p);
  const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);

  // Metrics overview cards — real derived data from /api/metrics.
  const metricCards = useMemo(() => {
    const g = metrics?.general;
    if (filter === 'all') {
      return [
        { label: 'Connected accounts', value: String(accounts.length) },
        { label: 'Total followers', value: formatFollowers(g?.general_follower_count ?? totalFollowers) },
        { label: 'Avg. engagement', value: `${g?.avg_engagement_rate_percentage ?? 0}%` },
        { label: 'Avg. comments', value: formatFollowers(g?.total_avg_comments ?? 0) },
      ];
    }
    const pm = (filter === 'facebook' ? metrics?.facebook : metrics?.instagram)?.[0];
    const cards = [
      { label: 'Followers', value: pm ? formatFollowers(pm.followers_count ?? 0) : '—' },
      { label: 'Engagement rate', value: pm ? `${pm.engagement_rate_percentage ?? 0}%` : '—' },
      { label: 'Avg. likes', value: pm ? formatFollowers(pm.avg_likes ?? 0) : '—' },
      { label: 'Avg. comments', value: pm ? formatFollowers(pm.avg_comments ?? 0) : '—' },
    ];
    if (filter === 'instagram' && pm?.top_age_percentage) {
      cards.push({ label: 'Top age', value: `${pm.top_age_percentage.label} (${pm.top_age_percentage.percentage}%)` });
      if (pm.top_gender_percentage) cards.push({ label: 'Top gender', value: `${pm.top_gender_percentage.label} (${pm.top_gender_percentage.percentage}%)` });
      if (pm.top_country_percentage) cards.push({ label: 'Top country', value: `${pm.top_country_percentage.label} (${pm.top_country_percentage.percentage}%)` });
    }
    return cards;
  }, [filter, accounts, totalFollowers, metrics]);

  const connectedPlatforms = accounts.map((a) => a.platform);

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Metrics Overview ---- */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-Sora text-2xl font-medium text-text-dark">Metrics Overview</p>
          <div className="flex items-center gap-2">
            {/* platform selector */}
            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
              <button onClick={() => setFilter('all')}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium', filter === 'all' ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100')}>
                All Platforms
              </button>
              {connectedPlatforms.map((p) => (
                <button key={p} onClick={() => setFilter(p)}
                  className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', filter === p ? 'bg-secondary-200 text-primary-900' : 'text-neutral-600 hover:bg-neutral-100')}>
                  <PlatformChip platform={p} /> {getPlatform(p).name}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50" title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {accounts.length === 0 && !loading ? (
          <DemoCard className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Users size={22} /></span>
            <p className="text-sm text-neutral-600">No accounts connected yet — link one below to see your metrics.</p>
          </DemoCard>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {metricCards.map((c, i) => <StatCard key={`${c.label}-${i}`} label={c.label} value={c.value} />)}
          </div>
        )}
      </div>

      {/* result banner */}
      <AnimatePresence>
        {banner && (
          <div className={cn('flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
            banner.tone === 'success' ? 'border-warnings-success/30 bg-warnings-successBg text-warnings-success' : 'border-text-red/30 bg-text-red/5 text-text-red')}>
            <span className="flex items-center gap-2">{banner.tone === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}{banner.text}</span>
            <button onClick={() => setBanner(null)} className="text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}
      </AnimatePresence>

      {/* ---- Social Media Connections ---- */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-6">
          <p className="text-lg font-medium text-text-dark">Social Media Connections</p>
          <p className="pt-0.5 text-sm text-neutral-700">
            Link the Chamber's social profiles to publish, schedule and measure performance from one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PLATFORMS.map((p) => {
            const acc = byPlatform(p.id);
            const isLinked = Boolean(acc);
            const isConnectable = CONNECTABLE.includes(p.id);
            return (
              <div key={p.id}
                className={cn('w-full rounded-2xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:shadow-sm', !isConnectable && 'opacity-50 grayscale')}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PlatformChip platform={p.id} size="lg" />
                    <div>
                      {isLinked ? (
                        <>
                          <p className="text-sm font-medium text-neutral-1000">{p.name}</p>
                          <p className="text-xs text-neutral-700">{acc?.name ?? acc?.accountId}{acc?.followers != null ? ` · ${formatFollowers(acc.followers)} followers` : ''}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-text-dark">{p.name}</p>
                      )}
                    </div>
                  </div>

                  {!isConnectable ? (
                    <span className="text-sm font-medium text-neutral-400">Coming soon</span>
                  ) : !isLinked ? (
                    <div className="w-32">
                      <Button variant="text" size="small" onClick={() => connect(p.id)}>Link Account</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => connect(p.id)} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">Replace</button>
                      <button onClick={() => setConfirmRemove(acc!)} disabled={busy === acc?.accountId}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-text-red hover:bg-text-red/5 disabled:opacity-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* remove confirmation */}
      <AnimatePresence>
        {confirmRemove && (
          <Backdrop onClose={() => setConfirmRemove(null)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-[28rem] rounded-xl bg-white p-6 text-center shadow-7">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-text-red/10 text-text-red"><Trash2 size={22} /></span>
              <p className="text-base font-semibold md:text-lg">Remove social media account</p>
              <p className="pb-4 pt-1 text-sm text-neutral-700">Are you sure you want to remove {getPlatform(confirmRemove.platform).name}? You can link it again anytime.</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1"><Button variant="outline" size="medium" onClick={() => setConfirmRemove(null)} disable={busy != null}>Cancel</Button></div>
                <div className="flex-1"><Button variant="primary" size="medium" className="!bg-text-red" loading={busy === confirmRemove.accountId} onClick={() => remove(confirmRemove)}>Remove</Button></div>
              </div>
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}
