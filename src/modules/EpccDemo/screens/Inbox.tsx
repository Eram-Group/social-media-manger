'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, ExternalLink, RefreshCw, Inbox as InboxIcon, Send, Check } from 'lucide-react';
import { DemoCard, SectionTitle, PlatformChip } from '../_components/ui';
import { TPlatformId } from '@/mock-server/platforms';

interface InboxItem {
  id: string;
  platform: TPlatformId;
  accountId: string;
  author: string;
  text: string;
  time: string;
  postId: string;
  postExcerpt?: string;
  permalink?: string;
}

const when = (iso: string) => {
  if (!iso) return '';
  return iso.slice(0, 16).replace('T', ' ');
};

export default function Inbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/inbox', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Inline reply state, keyed by comment id.
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replied, setReplied] = useState<Record<string, boolean>>({});
  const [replyErr, setReplyErr] = useState('');

  const sendReply = async (c: InboxItem) => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setReplyErr('');
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: c.platform, accountId: c.accountId, commentId: c.id, message: replyText.trim() }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        setReplied((m) => ({ ...m, [c.id]: true }));
        setReplyId(null);
        setReplyText('');
      } else {
        setReplyErr(j.error || 'Reply failed');
      }
    } catch (e) {
      setReplyErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle title="Inbox" subtitle="Real comments on your connected Pages' posts." />
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <DemoCard className="py-12 text-center text-sm text-neutral-500">Loading comments…</DemoCard>
      ) : items.length === 0 ? (
        <DemoCard className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-800"><InboxIcon size={22} /></span>
          <div>
            <p className="font-Sora text-base font-semibold">No comments yet</p>
            <p className="mt-1 text-sm text-neutral-500">When people comment on your Pages' posts, they'll appear here.</p>
          </div>
        </DemoCard>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <DemoCard key={c.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PlatformChip platform={c.platform} size="sm" />
                  <span className="text-sm font-semibold text-text-dark">{c.author}</span>
                  <span className="flex items-center gap-1 text-xs text-neutral-400"><MessageCircle size={12} /> comment</span>
                </div>
                <span className="text-xs text-neutral-400">{when(c.time)}</span>
              </div>
              <p className="text-sm text-neutral-800">{c.text}</p>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
                {c.postExcerpt ? <span className="truncate text-xs text-neutral-400">on: {c.postExcerpt}…</span> : <span />}
                <div className="flex shrink-0 items-center gap-3">
                  {replied[c.id] ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-warnings-success"><Check size={12} /> Replied</span>
                  ) : (
                    <button onClick={() => { setReplyId(replyId === c.id ? null : c.id); setReplyText(''); setReplyErr(''); }} className="flex items-center gap-1 text-xs font-medium text-primary-800 hover:underline">
                      <MessageCircle size={12} /> Reply
                    </button>
                  )}
                  {c.permalink && (
                    <a href={c.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:underline">
                      Open <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {replyId === c.id && (
                <div className="flex flex-col gap-2 border-t border-neutral-100 pt-2">
                  <div className="flex items-center gap-2">
                    <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendReply(c); }}
                      placeholder="Write a reply…" className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-400" />
                    <button onClick={() => sendReply(c)} disabled={sending || !replyText.trim()} className="flex items-center gap-1 rounded-lg bg-primary-800 px-3 py-2 text-sm font-medium text-white hover:bg-primary-900 disabled:opacity-50">
                      <Send size={14} /> {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                  {replyErr && <p className="text-xs text-text-red">{replyErr}</p>}
                </div>
              )}
            </DemoCard>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-400">In-app replies use the <code>pages_manage_engagement</code> permission. If a reply errors with a permissions message, reconnect the account to grant it.</p>
    </div>
  );
}
