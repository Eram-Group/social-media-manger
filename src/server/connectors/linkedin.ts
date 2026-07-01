import {
  ConnectedAccount, PublishInput, PublishResult, SocialConnector,
} from './types';
import { LINKEDIN, assertLinkedInConfigured, redirectUri } from '@/server/env';
import { LI_REST, LI_OAUTH, LINKEDIN_VERSION, LINKEDIN_SCOPES } from './linkedin.config';
import { upsertAccounts } from '@/server/store';

// ── Request helpers ──────────────────────────────────────────────────────────
function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

async function liGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${LI_REST}${path}`, { headers: headers(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`LinkedIn GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function liPost<T>(token: string, path: string, body: unknown): Promise<{ data: T; restliId?: string }> {
  const res = await fetch(`${LI_REST}${path}`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LinkedIn POST ${path} failed: ${res.status} ${await res.text()}`);
  const restliId = res.headers.get('x-restli-id') || undefined;
  const text = await res.text();
  return { data: (text ? JSON.parse(text) : {}) as T, restliId };
}

// ── OAuth ────────────────────────────────────────────────────────────────────
interface ITokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

async function exchangeCodeForTokens(code: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri('linkedin'),
    client_id: LINKEDIN.clientId,
    client_secret: LINKEDIN.clientSecret,
  });
  const res = await fetch(`${LI_OAUTH}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<ITokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: LINKEDIN.clientId,
    client_secret: LINKEDIN.clientSecret,
  });
  const res = await fetch(`${LI_OAUTH}/accessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`LinkedIn token refresh failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ITokenResponse>;
}

// Refresh the access token if it is within a 5-day buffer of expiry, persist, and
// return the (possibly updated) account. Used before every publish/read call.
export async function ensureFreshToken(account: ConnectedAccount): Promise<ConnectedAccount> {
  const now = Math.floor(Date.now() / 1000);
  const BUFFER = 5 * 24 * 3600;
  if ((account.tokenExpiresAt ?? 0) - now > BUFFER) return account;

  const meta = (account.meta ?? {}) as Record<string, any>;
  const refreshToken = meta.refreshToken as string | undefined;
  const refreshExp = meta.refreshTokenExpiresAt as number | undefined;
  if (!refreshToken || (refreshExp && refreshExp < now)) {
    throw new Error('LinkedIn authorization expired — reconnect the Page in Accounts.');
  }
  const t = await refreshAccessToken(refreshToken);
  const updated: ConnectedAccount = {
    ...account,
    accessToken: t.access_token,
    tokenExpiresAt: now + t.expires_in,
    meta: {
      ...meta,
      // LinkedIn may rotate the refresh token; keep the newest.
      refreshToken: t.refresh_token ?? refreshToken,
      refreshTokenExpiresAt: t.refresh_token_expires_in ? now + t.refresh_token_expires_in : refreshExp,
    },
  };
  await upsertAccounts([updated]);
  return updated;
}

// ── Org discovery ────────────────────────────────────────────────────────────
// Orgs where the authorizing user is an APPROVED ADMINISTRATOR.
async function listAdminOrgs(token: string): Promise<{ id: string; name: string; vanityName?: string }[]> {
  const acls = await liGet<{ elements: { organization: string }[] }>(
    token,
    '/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
  );
  const ids = (acls.elements ?? []).map((e) => e.organization.split(':').pop()!).filter(Boolean);
  const out: { id: string; name: string; vanityName?: string }[] = [];
  for (const id of ids) {
    try {
      const org = await liGet<{ localizedName?: string; vanityName?: string }>(token, `/organizations/${id}`);
      out.push({ id, name: org.localizedName ?? `Organization ${id}`, vanityName: org.vanityName });
    } catch {
      out.push({ id, name: `Organization ${id}` });
    }
  }
  return out;
}

// ── Asset upload helpers ─────────────────────────────────────────────────────

export async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch media ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Initialize → PUT bytes → return the image URN to reference in a post.
export async function uploadImage(account: ConnectedAccount, bytes: Uint8Array): Promise<string> {
  const init = await liPost<{ value: { uploadUrl: string; image: string } }>(
    account.accessToken,
    '/images?action=initializeUpload',
    { initializeUploadRequest: { owner: account.accountId } },
  );
  const { uploadUrl, image } = init.data.value;
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${account.accessToken}` },
    body: bytes.buffer as ArrayBuffer,
  });
  if (!put.ok) throw new Error(`LinkedIn image upload failed: ${put.status} ${await put.text()}`);
  return image;
}

// Initialize (single-part) → PUT bytes → finalize → poll until AVAILABLE.
export async function uploadVideo(account: ConnectedAccount, bytes: Uint8Array): Promise<string> {
  const init = await liPost<{ value: { uploadInstructions: { uploadUrl: string }[]; video: string } }>(
    account.accessToken,
    '/videos?action=initializeUpload',
    { initializeUploadRequest: { owner: account.accountId, fileSizeBytes: bytes.byteLength, uploadCaptions: false, uploadThumbnail: false } },
  );
  const { uploadInstructions, video } = init.data.value;
  const etags: string[] = [];
  for (const part of uploadInstructions) {
    const put = await fetch(part.uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${account.accessToken}` },
      body: bytes.buffer as ArrayBuffer,
    });
    if (!put.ok) throw new Error(`LinkedIn video upload failed: ${put.status} ${await put.text()}`);
    const etag = put.headers.get('etag');
    if (etag) etags.push(etag);
  }
  await liPost(account.accessToken, '/videos?action=finalizeUpload', {
    finalizeUploadRequest: { video, uploadToken: '', uploadedPartIds: etags },
  });
  // Poll until processed (bounded — like the IG container poll).
  for (let i = 0; i < 30; i++) {
    const st = await liGet<{ status?: string }>(account.accessToken, `/videos/${encodeURIComponent(video)}`);
    if (st.status === 'AVAILABLE') return video;
    if (st.status === 'PROCESSING_FAILED') throw new Error('LinkedIn failed to process the video.');
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('LinkedIn video processing timed out.');
}

// ── Connector ────────────────────────────────────────────────────────────────
export const linkedinConnector: SocialConnector = {
  id: 'linkedin',

  assertConfigured: assertLinkedInConfigured,

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN.clientId,
      redirect_uri: redirectUri('linkedin'),
      state,
      scope: LINKEDIN_SCOPES,
    });
    return `${LI_OAUTH}/authorization?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<ConnectedAccount[]> {
    const t = await exchangeCodeForTokens(code);
    const now = Math.floor(Date.now() / 1000);
    const orgs = await listAdminOrgs(t.access_token);
    return orgs.map((o) => ({
      platform: 'linkedin' as const,
      accountId: `urn:li:organization:${o.id}`,
      name: o.name,
      accessToken: t.access_token,
      tokenExpiresAt: now + t.expires_in,
      meta: {
        refreshToken: t.refresh_token,
        refreshTokenExpiresAt: t.refresh_token_expires_in ? now + t.refresh_token_expires_in : undefined,
        vanityName: o.vanityName,
      },
    }));
  },

  async publish(_account: ConnectedAccount, _input: PublishInput): Promise<PublishResult> {
    // Implemented in Phase B (Task 6).
    throw new Error('LinkedIn publishing is not implemented yet.');
  },
};
