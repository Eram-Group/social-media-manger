import {
  ConnectedAccount, PublishInput, PublishResult, SocialConnector,
} from './types';
import { SNAPCHAT, assertSnapchatConfigured, redirectUri } from '@/server/env';
import { SNAP_API, SNAP_OAUTH, SNAP_API_VERSION, SNAPCHAT_SCOPES } from './snapchat.config';
import { upsertAccounts } from '@/server/store';

// ── Request helpers ──────────────────────────────────────────────────────────
function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function snapGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${SNAP_API}/${SNAP_API_VERSION}${path}`, { headers: authHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`Snapchat GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function snapPost<T>(token: string, path: string, body: unknown, json = true): Promise<T> {
  const res = await fetch(`${SNAP_API}/${SNAP_API_VERSION}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(token), ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(body) : (body as BodyInit),
  });
  if (!res.ok) throw new Error(`Snapchat POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function snapDelete(token: string, path: string): Promise<void> {
  const res = await fetch(`${SNAP_API}/${SNAP_API_VERSION}${path}`, { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok && res.status !== 204) throw new Error(`Snapchat DELETE ${path} failed: ${res.status} ${await res.text()}`);
}

// ── OAuth ────────────────────────────────────────────────────────────────────
interface ITokenResponse { access_token: string; expires_in: number; refresh_token?: string; }

export async function exchangeCodeForTokens(code: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: redirectUri('snapchat'),
    client_id: SNAPCHAT.clientId, client_secret: SNAPCHAT.clientSecret,
  });
  const res = await fetch(`${SNAP_OAUTH}/login/oauth2/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!res.ok) throw new Error(`Snapchat token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: refreshToken,
    client_id: SNAPCHAT.clientId, client_secret: SNAPCHAT.clientSecret,
  });
  const res = await fetch(`${SNAP_OAUTH}/login/oauth2/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!res.ok) throw new Error(`Snapchat token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}

// Snap access tokens are short-lived; refresh within a 5-min buffer, persist, return.
export async function ensureFreshToken(account: ConnectedAccount): Promise<ConnectedAccount> {
  const now = Math.floor(Date.now() / 1000);
  if ((account.tokenExpiresAt ?? 0) - now > 300) return account;
  const meta = (account.meta ?? {}) as Record<string, unknown>;
  const refreshToken = meta.refreshToken as string | undefined;
  if (!refreshToken) throw new Error('Snapchat authorization expired — reconnect in Accounts.');
  const t = await refreshAccessToken(refreshToken);
  const updated: ConnectedAccount = {
    ...account,
    accessToken: t.access_token,
    tokenExpiresAt: now + t.expires_in,
    meta: { ...meta, refreshToken: t.refresh_token ?? refreshToken },
  };
  await upsertAccounts([updated]);
  return updated;
}

// ── Public Profile discovery ─────────────────────────────────────────────────
// VERIFY endpoint: list the orgs the user can access, then the public profiles under them.
export async function listPublicProfiles(token: string): Promise<{ id: string; name: string; orgId: string }[]> {
  const out: { id: string; name: string; orgId: string }[] = [];
  try {
    const orgs = await snapGet<{ organizations: { organization: { id: string; name?: string } }[] }>(token, '/me/organizations');
    for (const o of orgs.organizations ?? []) {
      const orgId = o.organization.id;
      try {
        const pp = await snapGet<{ public_profiles: { public_profile: { id: string; display_name?: string } }[] }>(
          token, `/organizations/${orgId}/public_profiles`,
        );
        for (const p of pp.public_profiles ?? []) {
          out.push({ id: p.public_profile.id, name: p.public_profile.display_name ?? `Profile ${p.public_profile.id}`, orgId });
        }
      } catch { /* org may have no public profiles */ }
    }
  } catch { /* VERIFY: discovery path may differ; surfaced as no_profiles */ }
  return out;
}

// ── Media helpers ────────────────────────────────────────────────────────────
async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch media ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Register a media object, upload the bytes, return the media id. VERIFY paths.
async function uploadMedia(account: ConnectedAccount, bytes: Uint8Array, kind: 'IMAGE' | 'VIDEO'): Promise<string> {
  const orgId = (account.meta as Record<string, any>)?.organizationId;
  const created = await snapPost<{ media: { id: string }[] }>(
    account.accessToken, `/organizations/${orgId}/media`,
    { media: [{ name: `epcc-${kind.toLowerCase()}`, type: kind }] },
  );
  const mediaId = created.media?.[0]?.id;
  if (!mediaId) throw new Error('Snapchat media registration returned no id.');
  const form = new FormData();
  form.append('file', new Blob([bytes.buffer as ArrayBuffer]));
  await snapPost(account.accessToken, `/media/${mediaId}/upload`, form, false);
  return mediaId;
}

// ── Connector ────────────────────────────────────────────────────────────────
export const snapchatConnector: SocialConnector = {
  id: 'snapchat',
  assertConfigured: assertSnapchatConfigured,

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code', client_id: SNAPCHAT.clientId,
      redirect_uri: redirectUri('snapchat'), state, scope: SNAPCHAT_SCOPES,
    });
    return `${SNAP_OAUTH}/login/oauth2/authorize?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<ConnectedAccount[]> {
    const t = await exchangeCodeForTokens(code);
    const now = Math.floor(Date.now() / 1000);
    const profiles = await listPublicProfiles(t.access_token);
    return profiles.map((p) => ({
      platform: 'snapchat' as const,
      accountId: p.id,
      name: p.name,
      accessToken: t.access_token,
      tokenExpiresAt: now + t.expires_in,
      meta: { refreshToken: t.refresh_token, organizationId: p.orgId },
    }));
  },

  async publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult> {
    account = await ensureFreshToken(account);
    const isVideo = Boolean(input.videoUrl || input.videoBlob);
    const bytes = isVideo
      ? (input.videoBlob ? new Uint8Array(await input.videoBlob.arrayBuffer()) : await fetchBytes(input.videoUrl!))
      : (input.imageBlob ? new Uint8Array(await input.imageBlob.arrayBuffer())
         : await fetchBytes((input.imageUrl ?? input.imageUrls?.[0])!));
    const mediaId = await uploadMedia(account, bytes, isVideo ? 'VIDEO' : 'IMAGE');

    // Map format -> Snap content type.
    const type = input.format === 'story' ? 'STORY'
      : (input.format === 'reel' || input.format === 'video') ? 'SPOTLIGHT'
      : 'SAVED_STORY';

    // VERIFY: content-create endpoint + payload per type.
    const created = await snapPost<{ content: { id: string }[] }>(
      account.accessToken, `/public_profiles/${account.accountId}/content`,
      { content: [{ type, media_id: mediaId, caption: input.message ?? '' }] },
    );
    const contentId = created.content?.[0]?.id ?? '';
    return { remoteId: contentId, raw: created };
  },

  async deletePost(account: ConnectedAccount, remoteId: string): Promise<void> {
    account = await ensureFreshToken(account);
    await snapDelete(account.accessToken, `/content/${encodeURIComponent(remoteId)}`); // VERIFY path
  },
};
