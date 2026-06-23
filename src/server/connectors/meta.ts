// Shared Meta (Graph API) helpers used by both the Facebook and Instagram
// connectors: low-level fetch wrappers + the OAuth token chain
// (code -> short-lived user token -> long-lived user token -> Page tokens).
import { META } from '@/server/env';

const GRAPH = 'https://graph.facebook.com';

export function graphUrl(path: string): string {
  return `${GRAPH}/${META.graphVersion}/${path.replace(/^\//, '')}`;
}

async function readError(resp: Response): Promise<string> {
  try {
    const j = await resp.json();
    return j?.error?.message || `HTTP ${resp.status}`;
  } catch {
    return `HTTP ${resp.status}`;
  }
}

export async function graphGet<T = any>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${graphUrl(path)}?${qs}`, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Graph GET ${path} failed: ${await readError(resp)}`);
  return resp.json();
}

export async function graphPost<T = any>(path: string, body: Record<string, string>): Promise<T> {
  const resp = await fetch(graphUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`Graph POST ${path} failed: ${await readError(resp)}`);
  return resp.json();
}

// Build the Facebook Login OAuth dialog URL.
export function buildAuthUrl(redirect: string, scopes: string[], state: string): string {
  const qs = new URLSearchParams({
    client_id: META.appId,
    redirect_uri: redirect,
    state,
    response_type: 'code',
    scope: scopes.join(','),
  }).toString();
  return `https://www.facebook.com/${META.graphVersion}/dialog/oauth?${qs}`;
}

// Step 1: exchange the OAuth code for a short-lived user access token.
export async function exchangeCodeForUserToken(code: string, redirect: string): Promise<string> {
  const j = await graphGet<{ access_token: string }>('oauth/access_token', {
    client_id: META.appId,
    client_secret: META.appSecret,
    redirect_uri: redirect,
    code,
  });
  return j.access_token;
}

// Step 2: upgrade to a long-lived (~60 day) user token.
export async function getLongLivedUserToken(shortToken: string): Promise<string> {
  const j = await graphGet<{ access_token: string }>('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: META.appId,
    client_secret: META.appSecret,
    fb_exchange_token: shortToken,
  });
  return j.access_token;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string; // Page token — never expires when derived from a long-lived user token
}

// Step 3: list the Pages this user administers (each comes with its own Page token).
export async function getPages(userToken: string): Promise<MetaPage[]> {
  const j = await graphGet<{ data: MetaPage[] }>('me/accounts', {
    access_token: userToken,
    fields: 'id,name,access_token',
  });
  return j.data ?? [];
}

// Full chain: OAuth code -> the list of Pages with permanent Page tokens.
export async function codeToPages(code: string, redirect: string): Promise<MetaPage[]> {
  const shortToken = await exchangeCodeForUserToken(code, redirect);
  const longToken = await getLongLivedUserToken(shortToken);
  return getPages(longToken);
}
