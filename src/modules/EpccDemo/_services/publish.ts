// Client helper that publishes a post to the connected real platforms.
// Only platforms with a real connector + a connected account are attempted;
// everything else stays demo-only.
import { IPost, IPostRemoteRef } from '@/mock-server/posts';
import { TPlatformId } from '@/mock-server/platforms';

const SUPPORTED: TPlatformId[] = ['facebook', 'instagram'];

export interface PublishOutcome {
  platform: TPlatformId;
  accountId?: string;
  ok: boolean;
  remoteId?: string;
  url?: string;
  error?: string;
}

interface PublicAccount {
  platform: TPlatformId;
  accountId: string;
  name?: string;
}

// Only http(s) URLs can be sent to the platforms (local blob: previews can't).
const publicImage = (post: IPost): string | undefined =>
  post.media?.find((m) => /^https?:\/\//.test(m));

export async function publishPost(post: IPost): Promise<PublishOutcome[]> {
  const targets = post.platforms.filter((p) => SUPPORTED.includes(p));
  if (!targets.length) return [];

  let accounts: PublicAccount[] = [];
  try {
    const res = await fetch('/api/accounts', { cache: 'no-store' });
    accounts = (await res.json()).accounts ?? [];
  } catch {
    return targets.map((platform) => ({ platform, ok: false, error: 'Could not load connected accounts' }));
  }

  const imageUrl = publicImage(post);
  const outcomes: PublishOutcome[] = [];

  for (const platform of targets) {
    const acct = accounts.find((a) => a.platform === platform);
    if (!acct) {
      outcomes.push({ platform, ok: false, error: 'Not connected' });
      continue;
    }
    try {
      const res = await fetch('/api/posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, accountId: acct.accountId, message: post.content, imageUrl }),
      });
      const j = await res.json();
      if (res.ok && j.ok) {
        outcomes.push({ platform, accountId: acct.accountId, ok: true, remoteId: j.result.remoteId, url: j.result.url });
      } else {
        outcomes.push({ platform, accountId: acct.accountId, ok: false, error: j.error || 'Publish failed' });
      }
    } catch (e) {
      outcomes.push({ platform, accountId: acct.accountId, ok: false, error: (e as Error).message });
    }
  }
  return outcomes;
}

export const outcomesToRefs = (outcomes: PublishOutcome[]): IPostRemoteRef[] =>
  outcomes
    .filter((o) => o.ok && o.remoteId)
    .map((o) => ({ platform: o.platform, accountId: o.accountId ?? '', remoteId: o.remoteId!, url: o.url }));
