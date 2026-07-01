import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';
import { ConnectedAccount, PublishInput } from '@/server/connectors/types';
import { findAccount, savePublishedPost } from '@/server/store';
import { invalidate } from '@/server/cache';

// POST /api/posts/publish
// Accepts either:
//  - JSON: { platform, accountId, accessToken?, message?, imageUrl?, link?, scheduledPublishTime? }
//  - multipart/form-data: same fields + an `image` file (raw bytes uploaded directly)
//
// The access token is resolved server-side from the stored connected account
// (so the browser never handles it).
export async function POST(req: NextRequest) {
  let platform = '';
  let accountId = '';
  let accessToken: string | undefined;
  const input: PublishInput = {};

  const contentType = req.headers.get('content-type') || '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      platform = String(form.get('platform') || '');
      accountId = String(form.get('accountId') || '');
      accessToken = (form.get('accessToken') as string) || undefined;
      input.message = (form.get('message') as string) || undefined;
      input.link = (form.get('link') as string) || undefined;
      const sched = form.get('scheduledPublishTime');
      if (sched) input.scheduledPublishTime = Number(sched);
      const fmt = form.get('format');
      if (fmt) input.format = String(fmt) as any;
      const file = form.get('image');
      if (file instanceof Blob && file.size > 0) input.imageBlob = file;
      const video = form.get('video');
      if (video instanceof Blob && video.size > 0) input.videoBlob = video;
    } else {
      const body = await req.json();
      platform = body?.platform || '';
      accountId = body?.accountId || '';
      accessToken = body?.accessToken;
      input.message = body?.message;
      input.format = body?.format;
      input.imageUrl = body?.imageUrl;
      if (Array.isArray(body?.imageUrls) && body.imageUrls.length > 0) {
        input.imageUrls = body.imageUrls as string[];
      }
      input.videoUrl = body?.videoUrl;
      input.link = body?.link;
      input.scheduledPublishTime = body?.scheduledPublishTime;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!platform || !isSupported(platform)) {
    return NextResponse.json({ error: `Missing or unsupported platform: ${platform}` }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const stored = await findAccount(platform, accountId);
  const token = accessToken || stored?.accessToken;
  if (!token) {
    return NextResponse.json({ error: 'No access token found for this account. Connect it first.' }, { status: 400 });
  }

  const account: ConnectedAccount = { platform: platform as ConnectedAccount['platform'], accountId, accessToken: token, meta: stored?.meta };
  try {
    const result = await getConnector(platform).publish(account, input);
    // Persist a record for platforms we can't read back later (LinkedIn member
    // posts, Snapchat Stories) so they stay in the Posts list after a reload.
    // FB/IG are re-fetched from the platform, so they don't need this.
    if ((platform === 'linkedin' || platform === 'snapchat') && result.remoteId) {
      await savePublishedPost({
        platform,
        accountId,
        name: stored?.name,
        remoteId: result.remoteId,
        url: result.url,
        message: input.message,
        media: input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : undefined),
        format: input.format,
        createdAt: Math.floor(Date.now() / 1000),
      });
    }
    // New post — drop the cached list so it shows on next load.
    await invalidate('posts:list');
    return NextResponse.json({ ok: true, platform, result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
