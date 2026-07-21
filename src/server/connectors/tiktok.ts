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
function toVerifiedMediaUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('.public.blob.vercel-storage.com')) return url;
    return `${APP_BASE_URL}/api/media${u.pathname}`;
  } catch {
    return url;
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
      const init = await ttPost<{ data?: { publish_id?: string } }>(
        account.accessToken, '/post/publish/video/init/',
        { post_info: { title: input.message ?? '', privacy_level: privacyLevel },
          source_info: { source: 'PULL_FROM_URL', video_url: toVerifiedMediaUrl(videoUrl) } },
      );
      publishId = init.data?.publish_id ?? '';
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
