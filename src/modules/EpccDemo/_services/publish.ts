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

const firstImage = (post: IPost): string | undefined => post.media?.[0];
const isPublicUrl = (u?: string) => !!u && /^https?:\/\//.test(u);
const isLocalUrl = (u?: string) => !!u && (u.startsWith('blob:') || u.startsWith('data:'));

// Fetch a local blob:/data: URL back into a Blob so we can upload its bytes.
async function urlToBlob(url: string): Promise<Blob | null> {
  try {
    return await fetch(url).then((r) => r.blob());
  } catch {
    return null;
  }
}

// When scheduledPublishTime (unix seconds) is provided, the post is scheduled on
// the platform instead of published immediately.
export async function publishPost(post: IPost, scheduledPublishTime?: number): Promise<PublishOutcome[]> {
  const targets = post.platforms.filter((p) => SUPPORTED.includes(p));
  if (!targets.length) return [];

  let accounts: PublicAccount[] = [];
  try {
    const res = await fetch('/api/accounts', { cache: 'no-store' });
    accounts = (await res.json()).accounts ?? [];
  } catch {
    return targets.map((platform) => ({ platform, ok: false, error: 'Could not load connected accounts' }));
  }

  const img = firstImage(post);
  const vid = post.video;
  // Read local media bytes once so we can send them to each platform.
  const imgBlob = isLocalUrl(img) ? await urlToBlob(img!) : null;
  const vidBlob = isLocalUrl(vid) ? await urlToBlob(vid!) : null;
  const outcomes: PublishOutcome[] = [];

  for (const platform of targets) {
    const acct = accounts.find((a) => a.platform === platform);
    if (!acct) {
      outcomes.push({ platform, ok: false, error: 'Not connected' });
      continue;
    }
    try {
      let res: Response;
      if (vidBlob || imgBlob) {
        // Multipart: upload the raw media bytes (works without a public URL).
        const fd = new FormData();
        fd.append('platform', platform);
        fd.append('accountId', acct.accountId);
        fd.append('message', post.content);
        if (post.format) fd.append('format', post.format);
        if (vidBlob) fd.append('video', vidBlob, 'upload.mp4');
        else if (imgBlob) fd.append('image', imgBlob, 'upload.jpg');
        if (scheduledPublishTime) fd.append('scheduledPublishTime', String(scheduledPublishTime));
        res = await fetch('/api/posts/publish', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/posts/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform, accountId: acct.accountId, message: post.content, format: post.format,
            imageUrl: isPublicUrl(img) ? img : undefined,
            videoUrl: isPublicUrl(vid) ? vid : undefined,
            scheduledPublishTime,
          }),
        });
      }
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
