import { ConnectedAccount, PublishInput, PublishResult, SocialConnector } from './types';
import { APP_BASE_URL, TIKTOK, assertTiktokConfigured, redirectUri } from '@/server/env';
import { TIKTOK_API, TIKTOK_AUTH, TIKTOK_TOKEN, TIKTOK_SCOPES } from './tiktok.config';
import { upsertAccounts } from '@/server/store';

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
export async function ttGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${TIKTOK_API}${path}`, { headers: authHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`TikTok GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
export async function ttPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${TIKTOK_API}${path}`, {
    method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TikTok POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface ITokenResponse { access_token: string; expires_in: number; refresh_token?: string; open_id?: string; }
async function exchangeCodeForTokens(code: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    client_key: TIKTOK.clientKey, client_secret: TIKTOK.clientSecret, code,
    grant_type: 'authorization_code', redirect_uri: redirectUri('tiktok'),
  });
  const res = await fetch(TIKTOK_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}
async function refreshAccessToken(refreshToken: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    client_key: TIKTOK.clientKey, client_secret: TIKTOK.clientSecret,
    grant_type: 'refresh_token', refresh_token: refreshToken,
  });
  const res = await fetch(TIKTOK_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}
export async function ensureFreshToken(account: ConnectedAccount): Promise<ConnectedAccount> {
  const now = Math.floor(Date.now() / 1000);
  if ((account.tokenExpiresAt ?? 0) - now > 300) return account;
  const meta = (account.meta ?? {}) as Record<string, unknown>;
  const refreshToken = meta.refreshToken as string | undefined;
  if (!refreshToken) throw new Error('TikTok authorization expired — reconnect in Accounts.');
  const t = await refreshAccessToken(refreshToken);
  const updated: ConnectedAccount = {
    ...account, accessToken: t.access_token, tokenExpiresAt: now + t.expires_in,
    meta: { ...meta, refreshToken: t.refresh_token ?? refreshToken },
  };
  await upsertAccounts([updated]);
  return updated;
}

// TikTok's PULL_FROM_URL only accepts media from a verified domain. Vercel Blob
// serves from a hostname we cannot verify, so route those URLs through
// {APP_BASE_URL}/api/media/ — the app domain, which IS verified. Non-blob URLs
// (already on a verified prefix, or user-supplied) are passed through untouched.
// In local dev APP_BASE_URL is http://localhost:3000, which TikTok can neither
// reach nor verify. MEDIA_BASE_URL lets a developer point media at the deployed
// (verified) origin instead — the Blob store is shared, so the production proxy
// serves the very same objects.
function mediaBaseUrl(): string {
  return process.env.MEDIA_BASE_URL || APP_BASE_URL;
}

function toVerifiedMediaUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('.public.blob.vercel-storage.com')) return url;
    return `${mediaBaseUrl()}/api/media${u.pathname}`;
  } catch {
    return url;
  }
}

// ── FILE_UPLOAD (video) ──────────────────────────────────────────────────────
// Chunk bounds per TikTok's media transfer guide. A chunk must be >= 5MB and
// <= 64MB; the FINAL chunk absorbs the remainder and may exceed chunk_size.
const TT_MAX_CHUNK = 64 * 1024 * 1024;

interface IVideoInit { publishId: string; uploadUrl: string; chunkSize: number; totalChunkCount: number; }

// `total_chunk_count` is video_size / chunk_size rounded DOWN — not up. Rounding
// up leaves a final chunk TikTok never expects and the upload fails with 416.
function planChunks(size: number): { chunkSize: number; totalChunkCount: number } {
  if (size <= TT_MAX_CHUNK) return { chunkSize: size, totalChunkCount: 1 };
  return { chunkSize: TT_MAX_CHUNK, totalChunkCount: Math.floor(size / TT_MAX_CHUNK) };
}

async function probeMedia(url: string): Promise<{ size: number; contentType: string }> {
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not read video headers (${res.status}) from ${url}`);
  const size = Number(res.headers.get('content-length') ?? 0);
  if (!size) throw new Error('Video host did not report a Content-Length; FILE_UPLOAD needs the exact size.');
  return { size, contentType: res.headers.get('content-type') ?? 'video/mp4' };
}

// Streams the video to TikTok chunk by chunk, pulling each range from the source
// only as it is needed so we never hold the whole file in memory.
async function uploadVideoChunks(init: IVideoInit, url: string, size: number, contentType: string): Promise<void> {
  const { uploadUrl, chunkSize, totalChunkCount } = init;
  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const end = i === totalChunkCount - 1 ? size - 1 : start + chunkSize - 1;
    const part = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, cache: 'no-store' });
    if (!part.ok) throw new Error(`Failed to read bytes ${start}-${end} of the video: ${part.status}`);
    const body = Buffer.from(await part.arrayBuffer());
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType, 'Content-Range': `bytes ${start}-${end}/${size}` },
      body,
    });
    // 206 = chunk accepted, keep going. 201 = final chunk received, publishing starts.
    if (res.status !== 206 && res.status !== 201) {
      throw new Error(`TikTok chunk ${i + 1}/${totalChunkCount} upload failed: ${res.status} ${await res.text()}`);
    }
  }
}

// TikTok issues sandbox credentials with an "sb" prefix on the client key.
function isSandboxClient(): boolean {
  return TIKTOK.clientKey.startsWith('sb');
}

async function getCreatorInfo(account: ConnectedAccount): Promise<{ privacyLevel: string }> {
  const r = await ttPost<{ data?: { privacy_level_options?: string[] } }>(
    account.accessToken, '/post/publish/creator_info/query/', {},
  );
  const opts = r.data?.privacy_level_options ?? [];
  // Sandbox client keys are prefixed "sb". Such clients are unaudited, and TikTok
  // rejects any non-SELF_ONLY post with `unaudited_client_can_only_post_to_private_accounts`
  // — even when creator_info still advertises PUBLIC_TO_EVERYONE for a public
  // account. Ask only for what can actually be granted.
  if (isSandboxClient()) return { privacyLevel: 'SELF_ONLY' };
  // Prefer PUBLIC when allowed; else the first allowed (SELF_ONLY pre-audit).
  const privacyLevel = opts.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : (opts[0] ?? 'SELF_ONLY');
  return { privacyLevel };
}

export const tiktokConnector: SocialConnector = {
  id: 'tiktok',
  assertConfigured: assertTiktokConfigured,
  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: TIKTOK.clientKey, redirect_uri: redirectUri('tiktok'),
      response_type: 'code', scope: TIKTOK_SCOPES, state,
    });
    return `${TIKTOK_AUTH}?${params.toString()}`;
  },
  async exchangeCode(code: string): Promise<ConnectedAccount[]> {
    const t = await exchangeCodeForTokens(code);
    const now = Math.floor(Date.now() / 1000);
    let name: string | undefined; let followers: number | undefined;
    try {
      const info = await ttGet<{ data?: { user?: { display_name?: string; follower_count?: number; open_id?: string } } }>(
        t.access_token, '/user/info/?fields=open_id,display_name,follower_count',
      );
      name = info.data?.user?.display_name; followers = info.data?.user?.follower_count;
    } catch { /* VERIFY user/info shape; still connect with open_id */ }
    const openId = t.open_id ?? 'me';
    return [{
      platform: 'tiktok' as const,
      accountId: openId,
      name: name ?? `TikTok ${openId.slice(0, 8)}`,
      followers,
      accessToken: t.access_token,
      tokenExpiresAt: now + t.expires_in,
      meta: { refreshToken: t.refresh_token },
    }];
  },
  async publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult> {
    account = await ensureFreshToken(account);
    const { privacyLevel } = await getCreatorInfo(account);
    const isVideo = Boolean(input.videoUrl || input.videoBlob);
    let publishId: string;

    if (isVideo) {
      const videoUrl = input.videoUrl;
      if (!videoUrl) throw new Error('TikTok video publish requires a public video URL.');
      // FILE_UPLOAD rather than PULL_FROM_URL: we send the bytes ourselves, so the
      // host never needs domain verification and large files don't have to stream
      // back out through our own /api/media proxy.
      const { size, contentType } = await probeMedia(videoUrl);
      const { chunkSize, totalChunkCount } = planChunks(size);
      const init = await ttPost<{ data?: { publish_id?: string; upload_url?: string } }>(
        account.accessToken, '/post/publish/video/init/',
        { post_info: { title: input.message ?? '', privacy_level: privacyLevel },
          source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunkSize, total_chunk_count: totalChunkCount } },
      );
      publishId = init.data?.publish_id ?? '';
      const uploadUrl = init.data?.upload_url;
      if (!uploadUrl) throw new Error('TikTok did not return an upload_url for the video.');
      await uploadVideoChunks({ publishId, uploadUrl, chunkSize, totalChunkCount }, videoUrl, size, contentType);
    } else {
      const photos = input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []);
      if (!photos.length) throw new Error('TikTok photo publish requires at least one public image URL.');
      const init = await ttPost<{ data?: { publish_id?: string } }>(
        account.accessToken, '/post/publish/content/init/',
        { media_type: 'PHOTO', post_mode: 'DIRECT_POST',
          post_info: { title: input.message ?? '', privacy_level: privacyLevel },
          source_info: { source: 'PULL_FROM_URL', photo_images: photos.map(toVerifiedMediaUrl) } },
      );
      publishId = init.data?.publish_id ?? '';
    }

    // Poll status until complete (bounded).
    for (let i = 0; i < 30 && publishId; i++) {
      const st = await ttPost<{ data?: { status?: string } }>(
        account.accessToken, '/post/publish/status/fetch/', { publish_id: publishId },
      );
      const status = st.data?.status;
      if (status === 'PUBLISH_COMPLETE') break;
      if (status === 'FAILED') throw new Error('TikTok failed to publish the post.');
      await new Promise((r) => setTimeout(r, 3000));
    }
    return { remoteId: publishId, raw: { publishId } };
  },

  async getMetrics(account: ConnectedAccount, remoteId: string): Promise<Record<string, number>> {
    account = await ensureFreshToken(account);
    const out: Record<string, number> = {};
    try {
      // VERIFY: video query shape + field names; needs the video.list scope.
      const r = await ttPost<{ data?: { videos?: { view_count?: number; like_count?: number; comment_count?: number; share_count?: number }[] } }>(
        account.accessToken, '/video/query/?fields=view_count,like_count,comment_count,share_count',
        { filters: { video_ids: [remoteId] } },
      );
      const v = r.data?.videos?.[0];
      if (v) {
        if (typeof v.view_count === 'number') out.views = v.view_count;
        if (typeof v.like_count === 'number') out.likes = v.like_count;
        if (typeof v.comment_count === 'number') out.comments = v.comment_count;
        if (typeof v.share_count === 'number') out.shares = v.share_count;
      }
    } catch { /* metric unavailable — omit */ }
    return out;
  },
};

// Account-level follower count for Analytics/Reports surfacing.
export async function getUserStats(account: ConnectedAccount): Promise<{ followers?: number }> {
  const fresh = await ensureFreshToken(account);
  try {
    const info = await ttGet<{ data?: { user?: { follower_count?: number } } }>(
      fresh.accessToken, '/user/info/?fields=follower_count',
    );
    return { followers: info.data?.user?.follower_count };
  } catch {
    return {};
  }
}
