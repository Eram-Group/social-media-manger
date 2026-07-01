// Client helper that publishes a post to the connected real platforms.
// Only platforms with a real connector + a connected account are attempted;
// everything else stays demo-only.
import { IPost, IPostRemoteRef } from '@/mock-server/posts';
import { TPlatformId } from '@/mock-server/platforms';

const SUPPORTED: TPlatformId[] = ['facebook', 'instagram', 'linkedin', 'snapchat', 'x', 'tiktok'];

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

  // Resolve media to a PUBLIC url usable by every platform (Instagram can't take
  // raw bytes — it needs a public URL). Local uploads are hosted on Blob once.
  const toPublic = async (u?: string): Promise<string | undefined> => {
    if (!u) return undefined;
    if (isPublicUrl(u)) return u;
    if (!isLocalUrl(u)) return undefined;
    const blob = await urlToBlob(u);
    if (!blob) return undefined;
    try {
      const fd = new FormData();
      fd.append('file', blob, blob.type.startsWith('video') ? 'upload.mp4' : 'upload.jpg');
      const r = await fetch('/api/upload', { method: 'POST', body: fd }).then((x) => x.json());
      return r.url || undefined;
    } catch {
      return undefined;
    }
  };

  const imageUrl = await toPublic(firstImage(post));
  const videoUrl = await toPublic(post.video);

  // Resolve full media array for LinkedIn multi-image (single-image and video stay
  // on their own paths; imageUrls is only sent to LinkedIn).
  const resolvedImageUrls: string[] = [];
  for (const m of post.media ?? []) {
    const pub = await toPublic(m);
    if (pub) resolvedImageUrls.push(pub);
  }

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
        body: JSON.stringify({
          platform, accountId: acct.accountId, message: post.content, format: post.format,
          imageUrl, videoUrl, scheduledPublishTime,
          // LinkedIn/Snapchat/X/TikTok: pass full image array for multi-image support; connector
          // uses imageUrls when present (falls back to imageUrl for single image).
          ...((platform === 'linkedin' || platform === 'snapchat' || platform === 'x' || platform === 'tiktok') && resolvedImageUrls.length > 0 && { imageUrls: resolvedImageUrls }),
        }),
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
