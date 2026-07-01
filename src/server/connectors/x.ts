import { ConnectedAccount, PublishInput, PublishResult, SocialConnector } from './types';
import { X, assertXConfigured, redirectUri } from '@/server/env';
import { X_API, X_AUTH, X_TOKEN, X_UPLOAD, X_SCOPES, X_MAX_IMAGES } from './x.config';
import { upsertAccounts } from '@/server/store';

// ── Request helpers ──────────────────────────────────────────────────────────
function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
// Confidential-client credentials for the token endpoint (Basic auth).
function basicAuth(): string {
  return 'Basic ' + Buffer.from(`${X.clientId}:${X.clientSecret}`).toString('base64');
}

async function xGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${X_API}${path}`, { headers: authHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`X GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
async function xPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${X_API}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`X POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
async function xDelete<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${X_API}${path}`, { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok) throw new Error(`X DELETE ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── OAuth (Authorization Code + PKCE, confidential client) ───────────────────
interface ITokenResponse { access_token: string; expires_in: number; refresh_token?: string; scope?: string; }

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri('x'),
    client_id: X.clientId,
    code_verifier: codeVerifier,
  });
  const res = await fetch(X_TOKEN, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`X token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: X.clientId,
  });
  const res = await fetch(X_TOKEN, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`X token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}

// Refresh the short-lived access token when within a 5-minute buffer of expiry,
// persist the rotated refresh token, and return the (possibly updated) account.
export async function ensureFreshToken(account: ConnectedAccount): Promise<ConnectedAccount> {
  const now = Math.floor(Date.now() / 1000);
  if ((account.tokenExpiresAt ?? 0) - now > 300) return account;
  const meta = (account.meta ?? {}) as Record<string, unknown>;
  const refreshToken = meta.refreshToken as string | undefined;
  if (!refreshToken) throw new Error('X authorization expired — reconnect in Accounts.');
  const t = await refreshAccessToken(refreshToken);
  const updated: ConnectedAccount = {
    ...account,
    accessToken: t.access_token,
    tokenExpiresAt: now + t.expires_in,
    // X rotates the refresh token on every refresh — keep the newest.
    meta: { ...meta, refreshToken: t.refresh_token ?? refreshToken },
  };
  await upsertAccounts([updated]);
  return updated;
}

// ── Media upload (chunked INIT → APPEND → FINALIZE → poll) ───────────────────
async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch media ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// VERIFY: X media upload endpoint/host + command flow (INIT/APPEND/FINALIZE/STATUS)
// and the media_category values against the live X API v2 docs.
async function uploadMedia(token: string, bytes: Uint8Array, mediaType: string, category: string): Promise<string> {
  // INIT
  const initForm = new URLSearchParams({
    command: 'INIT',
    total_bytes: String(bytes.byteLength),
    media_type: mediaType,
    media_category: category,
  });
  const initRes = await fetch(X_UPLOAD, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: initForm,
  });
  if (!initRes.ok) throw new Error(`X media INIT failed: ${initRes.status} ${await initRes.text()}`);
  const initJson = (await initRes.json()) as { data?: { id?: string }; media_id_string?: string };
  const mediaId = initJson.data?.id ?? initJson.media_id_string ?? '';
  if (!mediaId) throw new Error('X media INIT returned no media id.');

  // APPEND in 4 MB chunks.
  const CHUNK = 4 * 1024 * 1024;
  for (let offset = 0, seg = 0; offset < bytes.byteLength; offset += CHUNK, seg++) {
    const slice = bytes.slice(offset, Math.min(offset + CHUNK, bytes.byteLength));
    const fd = new FormData();
    fd.append('command', 'APPEND');
    fd.append('media_id', mediaId);
    fd.append('segment_index', String(seg));
    fd.append('media', new Blob([slice.buffer as ArrayBuffer]));
    const apRes = await fetch(X_UPLOAD, { method: 'POST', headers: authHeaders(token), body: fd });
    if (!apRes.ok) throw new Error(`X media APPEND failed: ${apRes.status} ${await apRes.text()}`);
  }

  // FINALIZE
  const finRes = await fetch(X_UPLOAD, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ command: 'FINALIZE', media_id: mediaId }),
  });
  if (!finRes.ok) throw new Error(`X media FINALIZE failed: ${finRes.status} ${await finRes.text()}`);
  const finJson = (await finRes.json()) as { data?: { processing_info?: { state?: string } }; processing_info?: { state?: string } };

  // Poll STATUS until processing completes (video/gif; images finish immediately).
  let info = finJson.data?.processing_info ?? finJson.processing_info;
  for (let i = 0; i < 30 && info && info.state && info.state !== 'succeeded'; i++) {
    if (info.state === 'failed') throw new Error('X failed to process the uploaded media.');
    await new Promise((r) => setTimeout(r, 3000));
    const stRes = await fetch(`${X_UPLOAD}?command=STATUS&media_id=${encodeURIComponent(mediaId)}`, {
      headers: authHeaders(token),
    });
    if (!stRes.ok) break;
    const stJson = (await stRes.json()) as { data?: { processing_info?: { state?: string } }; processing_info?: { state?: string } };
    info = stJson.data?.processing_info ?? stJson.processing_info;
  }
  return mediaId;
}

// ── Read-back: follower count for the connected account ──────────────────────
export async function getUserStats(account: ConnectedAccount): Promise<{ followers?: number }> {
  const fresh = await ensureFreshToken(account);
  try {
    const r = await xGet<{ data?: { public_metrics?: { followers_count?: number } } }>(
      fresh.accessToken, '/users/me?user.fields=public_metrics',
    );
    return { followers: r.data?.public_metrics?.followers_count };
  } catch {
    return {};
  }
}

// ── Connector ────────────────────────────────────────────────────────────────
export const xConnector: SocialConnector = {
  id: 'x',
  usesPkce: true,
  assertConfigured: assertXConfigured,

  getAuthUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: X.clientId,
      redirect_uri: redirectUri('x'),
      scope: X_SCOPES,
      state,
      code_challenge: codeChallenge ?? 'challenge',
      code_challenge_method: 'S256',
    });
    return `${X_AUTH}?${params.toString()}`;
  },

  async exchangeCode(code: string, codeVerifier?: string): Promise<ConnectedAccount[]> {
    if (!codeVerifier) throw new Error('X connect failed: missing PKCE code_verifier.');
    const t = await exchangeCodeForTokens(code, codeVerifier);
    const now = Math.floor(Date.now() / 1000);

    let id = 'me'; let name: string | undefined; let username: string | undefined; let followers: number | undefined;
    try {
      const me = await xGet<{ data?: { id?: string; name?: string; username?: string; public_metrics?: { followers_count?: number } } }>(
        t.access_token, '/users/me?user.fields=public_metrics,username,name',
      );
      id = me.data?.id ?? id;
      name = me.data?.name;
      username = me.data?.username;
      followers = me.data?.public_metrics?.followers_count;
    } catch { /* VERIFY /users/me shape; still connect with a fallback id */ }

    return [{
      platform: 'x' as const,
      accountId: id,
      name: name ?? (username ? `@${username}` : `X ${id.slice(0, 8)}`),
      followers,
      accessToken: t.access_token,
      tokenExpiresAt: now + t.expires_in,
      meta: { refreshToken: t.refresh_token, username },
    }];
  },

  async publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult> {
    account = await ensureFreshToken(account);

    // Resolve media → media_ids. A tweet allows up to 4 images OR a single video.
    const mediaIds: string[] = [];
    if (input.videoUrl || input.videoBlob) {
      const bytes = input.videoBlob
        ? new Uint8Array(await input.videoBlob.arrayBuffer())
        : await fetchBytes(input.videoUrl!);
      mediaIds.push(await uploadMedia(account.accessToken, bytes, 'video/mp4', 'tweet_video'));
    } else {
      const images = input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []);
      for (const url of images.slice(0, X_MAX_IMAGES)) {
        const bytes = await fetchBytes(url);
        mediaIds.push(await uploadMedia(account.accessToken, bytes, 'image/jpeg', 'tweet_image'));
      }
    }

    const body: Record<string, unknown> = { text: input.message ?? '' };
    if (mediaIds.length) body.media = { media_ids: mediaIds };

    const res = await xPost<{ data?: { id?: string } }>(account.accessToken, '/tweets', body);
    const id = res.data?.id ?? '';
    const username = (account.meta as Record<string, unknown> | undefined)?.username as string | undefined;
    return {
      remoteId: id,
      url: id ? `https://x.com/${username ?? 'i'}/status/${id}` : undefined,
      raw: res,
    };
  },

  async deletePost(account: ConnectedAccount, remoteId: string): Promise<void> {
    account = await ensureFreshToken(account);
    await xDelete(account.accessToken, `/tweets/${encodeURIComponent(remoteId)}`);
  },

  async getMetrics(account: ConnectedAccount, remoteId: string): Promise<Record<string, number>> {
    account = await ensureFreshToken(account);
    const out: Record<string, number> = {};
    try {
      const r = await xGet<{ data?: { public_metrics?: Record<string, number> } }>(
        account.accessToken, `/tweets/${encodeURIComponent(remoteId)}?tweet.fields=public_metrics`,
      );
      const m = r.data?.public_metrics;
      if (m) {
        if (typeof m.like_count === 'number') out.likes = m.like_count;
        if (typeof m.retweet_count === 'number') out.shares = m.retweet_count;
        if (typeof m.reply_count === 'number') out.comments = m.reply_count;
        if (typeof m.impression_count === 'number') out.impressions = m.impression_count;
      }
    } catch { /* metric unavailable — omit */ }
    return out;
  },
};
