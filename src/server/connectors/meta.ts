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

// Multipart POST — used to upload raw image bytes (e.g. /{page}/photos with `source`).
export async function graphPostForm<T = any>(path: string, form: FormData): Promise<T> {
  const resp = await fetch(graphUrl(path), { method: 'POST', body: form, cache: 'no-store' });
  if (!resp.ok) throw new Error(`Graph POST ${path} failed: ${await readError(resp)}`);
  return resp.json();
}

export async function graphDelete<T = any>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const resp = await fetch(`${graphUrl(path)}?${qs}`, { method: 'DELETE', cache: 'no-store' });
  if (!resp.ok) throw new Error(`Graph DELETE ${path} failed: ${await readError(resp)}`);
  return resp.json();
}

// Upload raw bytes to a Meta resumable-upload URL (rupload.facebook.com),
// used by Reels and video Stories.
export async function ruploadBytes(uploadUrl: string, token: string, bytes: ArrayBuffer): Promise<void> {
  const resp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      offset: '0',
      file_size: String(bytes.byteLength),
    },
    body: bytes,
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`Resumable upload failed: ${await readError(resp)}`);
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
  followers_count?: number;
  fan_count?: number;
}

const PAGE_FIELDS = 'id,name,access_token,followers_count,fan_count';

// Full chain: OAuth code -> long-lived user token.
export async function codeToUserToken(code: string, redirect: string): Promise<string> {
  const shortToken = await exchangeCodeForUserToken(code, redirect);
  return getLongLivedUserToken(shortToken);
}

// Source 1: classic edge — Pages where the user has a direct ("Facebook access") role.
async function pagesFromMeAccounts(userToken: string): Promise<MetaPage[]> {
  try {
    const j = await graphGet<{ data: MetaPage[] }>('me/accounts', {
      access_token: userToken,
      fields: PAGE_FIELDS,
      limit: '100',
    });
    return j.data ?? [];
  } catch (e) {
    console.warn('[meta] /me/accounts failed:', (e as Error).message);
    return [];
  }
}

// Source 2: Business-owned / New Pages Experience Pages reached via the user's
// Businesses (owned + client pages). Needs business_management to enumerate.
async function pagesFromBusinesses(userToken: string): Promise<MetaPage[]> {
  const found = new Map<string, MetaPage>();
  let businesses: { id: string; name?: string }[] = [];
  try {
    const j = await graphGet<{ data: { id: string; name?: string }[] }>('me/businesses', {
      access_token: userToken,
      fields: 'id,name',
      limit: '100',
    });
    businesses = j.data ?? [];
  } catch (e) {
    console.warn('[meta] /me/businesses failed (business_management not granted?):', (e as Error).message);
    return [];
  }
  console.warn(`[meta] found ${businesses.length} business(es): ${businesses.map((b) => b.name || b.id).join(', ')}`);

  for (const b of businesses) {
    for (const edge of ['owned_pages', 'client_pages']) {
      try {
        const r = await graphGet<{ data: MetaPage[] }>(`${b.id}/${edge}`, {
          access_token: userToken,
          fields: PAGE_FIELDS,
          limit: '100',
        });
        const list = r.data ?? [];
        console.warn(`[meta] ${b.id}/${edge} -> ${list.length} page(s)`);
        for (const p of list) found.set(p.id, p);
      } catch (e) {
        console.warn(`[meta] ${b.id}/${edge} failed:`, (e as Error).message);
      }
    }
  }
  return [...found.values()];
}

// A Page reached via a Business may not include a token in the list response.
// Fetch one directly with the user token (works when the user has page access).
async function ensurePageToken(page: MetaPage, userToken: string): Promise<MetaPage> {
  if (page.access_token) return page;
  try {
    const r = await graphGet<MetaPage>(`${page.id}`, { access_token: userToken, fields: PAGE_FIELDS });
    return { ...page, ...r };
  } catch (e) {
    console.warn(`[meta] could not fetch token for page ${page.id}:`, (e as Error).message);
    return page;
  }
}

// Robust discovery: try the personal edge first, then fall back to Businesses.
export async function discoverPages(userToken: string): Promise<MetaPage[]> {
  let pages = await pagesFromMeAccounts(userToken);
  console.warn(`[meta] /me/accounts -> ${pages.length} page(s)`);

  if (!pages.length) {
    const bizPages = await pagesFromBusinesses(userToken);
    const withTokens = await Promise.all(bizPages.map((p) => ensurePageToken(p, userToken)));
    pages = withTokens.filter((p) => p.access_token);
    console.warn(`[meta] business fallback -> ${bizPages.length} page(s), ${pages.length} with a usable token`);
  }

  if (!pages.length) {
    try {
      const perms = await graphGet<{ data: { permission: string; status: string }[] }>('me/permissions', {
        access_token: userToken,
      });
      console.warn('[meta] still 0 pages. Granted permissions:', JSON.stringify(perms.data));
    } catch {
      /* ignore */
    }
  }
  return pages;
}
