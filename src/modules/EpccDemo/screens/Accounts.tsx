import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { Button } from '@UI/index';
import { cn } from '@/shadecn/lib/utils';
import { Backdrop, ModalPanel, Stagger, StaggerItem } from '../_components/motion';
import {
  DemoCard,
  SectionTitle,
  PlatformChip,
  StatusPill,
  StatCard,
  formatFollowers,
} from '../_components/ui';
import { ACCOUNTS, IConnectedAccount, TAccountStatus } from '../_data/accounts';
import { PLATFORMS, getPlatform, TPlatformId } from '../_data/platforms';

const statusPill = (status: TAccountStatus) => {
  if (status === 'connected') return <StatusPill tone="success">Connected</StatusPill>;
  if (status === 'attention') return <StatusPill tone="caution">Needs attention</StatusPill>;
  if (status === 'syncing') return <StatusPill tone="info">Syncing…</StatusPill>;
  return <StatusPill tone="caution">Disconnected</StatusPill>;
};

const STATUS_FILTERS: { key: 'all' | TAccountStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'connected', label: 'Connected' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'syncing', label: 'Syncing' },
  { key: 'disconnected', label: 'Disconnected' },
];

export default function Accounts() {
  const [accounts, setAccounts] = useState<IConnectedAccount[]>(ACCOUNTS);
  const [statusFilter, setStatusFilter] = useState<'all' | TAccountStatus>('all');
  const [syncing, setSyncing] = useState<TPlatformId | 'all' | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const connected = accounts.filter((a) => a.status !== 'disconnected');
  const totalFollowers = connected.reduce((s, a) => s + a.followers, 0);
  const totalReach = connected.reduce((s, a) => s + a.reach, 0);
  const avgEng = connected.length
    ? (connected.reduce((s, a) => s + a.engagementRate, 0) / connected.length).toFixed(1)
    : '0';

  const setStatus = (platform: TPlatformId, status: TAccountStatus) =>
    setAccounts((prev) => prev.map((a) => (a.platform === platform ? { ...a, status } : a)));

  const sync = (platform: TPlatformId) => {
    setSyncing(platform);
    setStatus(platform, 'syncing');
    window.setTimeout(() => {
      setSyncing(null);
      setStatus(platform, 'connected');
      setAccounts((prev) =>
        prev.map((a) => (a.platform === platform ? { ...a, lastSync: 'just now' } : a)),
      );
    }, 1400);
  };

  const syncAll = () => {
    setSyncing('all');
    window.setTimeout(() => setSyncing(null), 1600);
  };

  const connect = (platform: TPlatformId) => {
    setShowAdd(false);
    setStatus(platform, 'syncing');
    window.setTimeout(() => {
      setAccounts((prev) =>
        prev.map((a) =>
          a.platform === platform
            ? { ...a, status: 'connected', followers: 58300, engagementRate: 6.1, reach: 240000, posts: 14, growth: 5.0, lastSync: 'just now' }
            : a,
        ),
      );
    }, 1500);
  };

  const disconnect = (platform: TPlatformId) =>
    setAccounts((prev) =>
      prev.map((a) =>
        a.platform === platform
          ? { ...a, status: 'disconnected', followers: 0, engagementRate: 0, reach: 0, posts: 0, growth: 0, lastSync: '—' }
          : a,
      ),
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle
          title="Connected Accounts"
          subtitle="Sync, manage and connect all of the Chamber's social accounts in one place."
        />
        <div className="flex gap-2">
          <div className="w-36">
            <Button variant="outline" size="medium" onClick={syncAll} loading={syncing === 'all'}
              leftIcon={syncing === 'all' ? undefined : <RefreshCw size={16} />}>
              Sync all
            </Button>
          </div>
          <div className="w-44">
            <Button variant="primary" size="medium" onClick={() => setShowAdd(true)} leftIcon={<Plus size={16} />}>
              Add a connector
            </Button>
          </div>
        </div>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Connected platforms" value={`${connected.length} / 6`} />
        <StatCard label="Total followers" value={formatFollowers(totalFollowers)} />
        <StatCard label="Monthly reach" value={formatFollowers(totalReach)} />
        <StatCard label="Avg. engagement" value={`${avgEng}%`} />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const count = f.key === 'all' ? accounts.length : accounts.filter((a) => a.status === f.key).length;
          return (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors', statusFilter === f.key ? 'border-primary-300 bg-secondary-200 font-medium text-primary-900' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100')}>
              {f.label}
              <span className={cn('rounded-full px-1.5 text-xs', statusFilter === f.key ? 'bg-primary-800 text-white' : 'bg-neutral-200 text-neutral-600')}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Account cards */}
      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.filter((a) => statusFilter === 'all' || a.status === statusFilter).map((a) => {
          const isDisconnected = a.status === 'disconnected';
          const isSyncing = a.status === 'syncing';
          return (
            <StaggerItem key={a.platform}>
            <DemoCard className={cn('flex h-full flex-col gap-4', isDisconnected && 'opacity-80')}>
              <div className="flex items-center justify-between">
                <PlatformChip platform={a.platform} size="md" withLabel />
                {statusPill(a.status)}
              </div>
              <p className="text-sm text-neutral-600">{a.handle}</p>

              {isDisconnected ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-neutral-100 py-6 text-center">
                  <p className="text-sm text-neutral-600">Not connected yet</p>
                  <div className="w-32">
                    <Button variant="primary" size="small" onClick={() => connect(a.platform)}>
                      Connect
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 border-t border-neutral-200 pt-4">
                    <Metric value={formatFollowers(a.followers)} label="Followers" />
                    <Metric value={`${a.engagementRate}%`} label="Engagement" />
                    <Metric value={formatFollowers(a.reach)} label="Reach" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('flex items-center gap-1 font-medium', a.growth >= 0 ? 'text-warnings-success' : 'text-text-red')}>
                      {a.growth >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {Math.abs(a.growth)}% this month
                    </span>
                    <span className="text-neutral-500">{a.posts} posts</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                    <span className="text-xs text-neutral-500">
                      {isSyncing ? 'Syncing…' : `Last sync: ${a.lastSync}`}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => sync(a.platform)}
                        disabled={isSyncing}
                        className="flex items-center gap-1 text-xs font-medium text-primary-800 hover:underline disabled:opacity-50">
                        <RefreshCw size={13} className={cn(isSyncing && 'animate-spin')} /> Sync
                      </button>
                      <button
                        onClick={() => disconnect(a.platform)}
                        className="text-xs font-medium text-text-red hover:underline">
                        Disconnect
                      </button>
                    </div>
                  </div>
                </>
              )}
            </DemoCard>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* Add connector modal */}
      <AnimatePresence>
        {showAdd && (
          <Backdrop onClose={() => setShowAdd(false)} className="items-center justify-center p-4">
            <ModalPanel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-7">
            <SectionTitle title="Add a connector" subtitle="Choose a platform to connect to the Chamber workspace." />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PLATFORMS.map((p) => {
                const acc = accounts.find((a) => a.platform === p.id);
                const already = acc && acc.status !== 'disconnected';
                return (
                  <button
                    key={p.id}
                    disabled={already}
                    onClick={() => connect(p.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                      already
                        ? 'cursor-default border-neutral-200 bg-neutral-100'
                        : 'border-neutral-300 hover:border-primary-300 hover:bg-primary-100',
                    )}>
                    <PlatformChip platform={p.id} size="lg" />
                    <span className="text-sm font-medium text-neutral-800">{getPlatform(p.id).name}</span>
                    {already ? (
                      <span className="flex items-center gap-1 text-xs text-warnings-success"><Check size={12} /> Connected</span>
                    ) : (
                      <span className="text-xs text-primary-800">Connect</span>
                    )}
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
