import { ConnectedAccount, PublishInput, PublishResult, SocialConnector } from './types';
import { TIKTOK, assertTiktokConfigured, redirectUri } from '@/server/env';
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
  async publish(_account: ConnectedAccount, _input: PublishInput): Promise<PublishResult> {
    throw new Error('TikTok publishing is not implemented yet.'); // Phase B, Task 4
  },
};
