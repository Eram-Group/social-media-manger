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

  async publish(_account: ConnectedAccount, _input: PublishInput): Promise<PublishResult> {
    throw new Error('Snapchat publishing is not implemented yet.'); // Phase B, Task 4
  },
};
