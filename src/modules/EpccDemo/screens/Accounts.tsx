'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, Check, AlertCircle, Link2 } from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { Backdrop, ModalPanel, Stagger, StaggerItem } from '../_components/motion';
import { DemoCard, SectionTitle, PlatformChip, StatusPill, StatCard, formatFollowers } from '../_components/ui';
import { PLATFORMS, getPlatform, TPlatformId } from '@/mock-server/platforms';

// Platforms with a real connector implemented today. The rest show "coming soon".
const CONNECTABLE: TPlatformId[] = ['facebook', 'instagram'];

// Shape returned by GET /api/accounts (tokens stripped server-side).
interface ConnectedAccount {
  platform: TPlatformId;
  accountId: string;
  name?: string;
  followers?: number;
  connectedAt?: number;
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
  const [showAdd, setShowAdd] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts', { cache: 'no-store' });
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Surface the result of the OAuth redirect (?connected=… or ?error=…).
  useEffect(() => {
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) setBanner({ tone: 'success', text: `${getPlatform(connected as TPlatformId).name} connected successfully ✓` });
    else if (error) setBanner({ tone: 'error', text: errorText(error) });
  }, [params]);

  const startConnect = (platform: TPlatformId) => {
    // Full-page navigation — kicks off the OAuth redirect to the provider.
    window.location.href = `/api/connect/${platform}`;
  };

  const disconnect = async (a: ConnectedAccount) => {
    setBusy(a.accountId);
    await fetch(`/api/accounts?platform=${a.platform}&accountId=${a.accountId}`, { method: 'DELETE' });
    setBusy(null);
    load();
  };

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          title="Connected Accounts"
          subtitle="Connect the Chamber's real social accounts via secure OAuth login."
        />
        <div className="flex gap-2">
          <div className="w-32">
            <Button variant="outline" size="medium" onClick={load} loading={loading}
              leftIcon={loading ? undefined : <RefreshCw size={16} />}>
              Refresh
            </Button>
          </div>
          <div className="w-44">
            <Button variant="primary" size="medium" onClick={() => setShowAdd(true)} leftIcon={<Plus size={16} />}>
              Connect account
            </Button>
          </div>
        </div>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {banner && (
          <div className={cn('flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
            banner.tone === 'success' ? 'border-warnings-success/30 bg-warnings-successBg text-warnings-success' : 'border-text-red/30 bg-text-red/5 text-text-red')}>
            <span className="flex items-center gap-2">
              {banner.tone === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {banner.text}
            </span>
            <button onClick={() => setBanner(null)} className="text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}
      </AnimatePresence>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Connected accounts" value={`${accounts.length}`} />
        <StatCard label="Total followers" value={formatFollowers(totalFollowers)} />
        <StatCard label="Platforms available" value={`${CONNECTABLE.length} live`} />
      </div>

      {/* Connected account cards */}
      {loading ? (
        <DemoCard className="py-12 text-center text-sm text-neutral-500">Loading connected accounts…</DemoCard>
      ) : accounts.length === 0 ? (
        <DemoCard className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><Link2 size={22} /></span>
          <div>
            <p className="font-Sora text-base font-semibold">No accounts connected yet</p>
            <p className="mt-1 text-sm text-neutral-500">Connect a Facebook Page or Instagram account to start publishing.</p>
          </div>
          <div className="w-52"><Button variant="primary" size="medium" onClick={() => setShowAdd(true)} leftIcon={<Plus size={16} />}>Connect account</Button></div>
        </DemoCard>
      ) : (
        <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <StaggerItem key={`${a.platform}:${a.accountId}`}>
              <DemoCard className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <PlatformChip platform={a.platform} size="md" withLabel />
                  <StatusPill tone="success">Connected</StatusPill>
                </div>
                <p className="text-sm text-neutral-600">{a.name ?? a.accountId}</p>
                <div className="grid grid-cols-2 gap-2 border-t border-neutral-200 pt-4">
                  <Metric value={a.followers != null ? formatFollowers(a.followers) : '—'} label="Followers" />
                  <Metric value={getPlatform(a.platform).name} label="Platform" />
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-neutral-200 pt-3">
                  <span className="text-xs text-neutral-500">Authorized via OAuth</span>
                  <button
                    onClick={() => disconnect(a)}
                    disabled={busy === a.accountId}
                    className="text-xs font-medium text-text-red hover:underline disabled:opacity-50">
                    {busy === a.accountId ? 'Removing…' : 'Disconnect'}
                  </button>
                </div>
              </DemoCard>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Connect modal */}
      <AnimatePresence>
        {showAdd && (
          <Backdrop onClose={() => setShowAdd(false)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-7">
              <SectionTitle title="Connect an account" subtitle="Sign in with the platform to authorize the Chamber workspace." />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {PLATFORMS.map((p) => {
                  const live = CONNECTABLE.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      disabled={!live}
                      onClick={() => live && startConnect(p.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                        live ? 'border-neutral-300 hover:border-primary-300 hover:bg-primary-100' : 'cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-70',
                      )}>
                      <PlatformChip platform={p.id} size="lg" />
                      <span className="text-sm font-medium text-neutral-800">{getPlatform(p.id).name}</span>
                      <span className={cn('text-xs', live ? 'text-primary-800' : 'text-neutral-400')}>
                        {live ? 'Sign in to connect' : 'Coming soon'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end">
                <div className="w-28"><Button variant="outline" size="medium" onClick={() => setShowAdd(false)}>Close</Button></div>
              </div>
            </ModalPanel>
          </Backdrop>
        )}
      </AnimatePresence>
    </div>
  );
}

const Metric = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="font-Sora text-lg font-semibold">{value}</p>
    <p className="text-xs text-neutral-500">{label}</p>
  </div>
);
