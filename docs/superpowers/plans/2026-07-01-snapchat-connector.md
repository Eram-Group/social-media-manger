# Snapchat Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Snapchat Public-Profile `SocialConnector` (OAuth + token refresh, publish Stories/Saved Stories/Spotlight, delete, read-back) wired into the connect routes, publisher (+ ledger), and analytics.

**Architecture:** A new `src/server/connectors/snapchat.ts` implementing the existing `SocialConnector` interface against Snapchat's Public Profile API (Marketing API). Reuses the shared `assertConfigured?()` hook, the connector-owned token-refresh pattern, and the published-posts ledger — all already on the base branch. Delivered in 3 phases: Connect → Publish/Delete → Read-back.

**Tech Stack:** Next.js 14 App Router, TypeScript 5, `@neondatabase/serverless` (via `src/server/store.ts`), Snapchat Public Profile / Marketing API (`adsapi.snapchat.com`), OAuth via `accounts.snapchat.com`.

## Global Constraints

- Snap API base `https://adsapi.snapchat.com`; OAuth host `https://accounts.snapchat.com`. Auth header `Authorization: Bearer <token>`.
- Server-only: Snap secrets from `process.env`, NEVER `NEXT_PUBLIC_`; tokens never returned to the browser (reuse `toPublic()`).
- Public-Profile posting only: `author`/owner is the connected Public Profile id. Scopes from `SNAPCHAT_SCOPES`.
- Token refresh: refresh token in `ConnectedAccount.meta.refreshToken`; `ensureFreshToken(account)` refreshes within a buffer and `upsertAccounts` the result; on failure throw `Error('Snapchat authorization expired — reconnect in Accounts.')`.
- Absent metrics → OMIT, never zero-fill. FB/IG/LinkedIn behavior must be UNCHANGED (additive branches only).
- `scheduledPublishTime` ignored for Snapchat. Content types: Story, Saved Story, Spotlight (no Lenses).
- Naming: `IXxx`/`TXxx`/`EXxx`; match the style of `linkedin.ts`/`meta.ts`.
- **Build-green mode:** no unit-test framework — gate is `npm run typecheck` (+ clean `npm run build`, `rm -rf .next` first). Do NOT attempt live Snap API calls. Snap request/response field names + exact endpoints are implemented per Snap docs and marked `// VERIFY` for the user's later live testing; do not stall on them.
- Branch: `feat/snapchat-connector` (stacked on `feat/linkedin-connector`).

---

## File Structure

**New**
- `src/server/connectors/snapchat.config.ts` — `SNAP_API`, `SNAP_OAUTH`, `SNAPCHAT_SCOPES`, `SNAP_API_VERSION`, content-type constants.
- `src/server/connectors/snapchat.ts` — helpers (`snapGet/snapPost/snapDelete`, OAuth exchange+refresh, `ensureFreshToken`, `listPublicProfiles`, `uploadMedia`, content create/delete, `getMetrics`, `getProfileStats`) + `snapchatConnector`.

**Modified**
- `src/server/env.ts` — `SNAPCHAT` config + `assertSnapchatConfigured()`.
- `src/server/connectors/registry.ts` — register `snapchat`.
- `app/api/connect/[platform]/callback/route.ts` — `no_profiles` reason for snapchat.
- `src/modules/EpccDemo/_services/publish.ts` — `SUPPORTED += 'snapchat'` + media/format mapping.
- `app/api/posts/publish/route.ts` — persist snapchat posts to the ledger on success.
- `src/modules/EpccDemo/screens/Accounts.tsx` — add `snapchat` to `CONNECTABLE`.
- `app/api/overview/route.ts`, `app/api/metrics/route.ts`, `app/api/report/route.ts` — add a `snapchat` branch.

---

# PHASE A — Foundation + Connect

## Task 1: Snapchat config + env

**Files:**
- Create: `src/server/connectors/snapchat.config.ts`
- Modify: `src/server/env.ts`

**Interfaces:**
- Produces: `SNAP_API='https://adsapi.snapchat.com'`, `SNAP_OAUTH='https://accounts.snapchat.com'`, `SNAP_API_VERSION='v1'`, `SNAPCHAT_SCOPES` (from config); `SNAPCHAT={clientId,clientSecret}`, `assertSnapchatConfigured()` (from env).

- [ ] **Step 1: Create `snapchat.config.ts`**

```ts
// Snapchat Public Profile / Marketing API constants.
export const SNAP_API = 'https://adsapi.snapchat.com';
export const SNAP_OAUTH = 'https://accounts.snapchat.com';
export const SNAP_API_VERSION = 'v1';

// Public Profile API access. VERIFY the exact scope string(s) against the Snap
// app's granted scopes during live testing.
export const SNAPCHAT_SCOPES = 'snapchat-marketing-api';

export type TSnapContentType = 'STORY' | 'SAVED_STORY' | 'SPOTLIGHT';
```

- [ ] **Step 2: Add to `env.ts`** (after the LINKEDIN block)

```ts
export const SNAPCHAT = {
  clientId: process.env.SNAPCHAT_CLIENT_ID || '',
  clientSecret: process.env.SNAPCHAT_CLIENT_SECRET || '',
};

export function assertSnapchatConfigured(): void {
  if (!SNAPCHAT.clientId || !SNAPCHAT.clientSecret) {
    throw new Error(
      'Snapchat is not configured. Set SNAPCHAT_CLIENT_ID and SNAPCHAT_CLIENT_SECRET in your .env / .env.local.',
    );
  }
}
```

- [ ] **Step 3: Typecheck** — `npm run typecheck` → PASS.
- [ ] **Step 4: Commit** — `git add src/server/connectors/snapchat.config.ts src/server/env.ts && git commit -m "feat(snapchat): add Snapchat API config + env"`

---

## Task 2: Connector core — OAuth, profile discovery, token refresh, connect wiring

**Files:**
- Create: `src/server/connectors/snapchat.ts`
- Modify: `src/server/connectors/registry.ts`, `app/api/connect/[platform]/callback/route.ts`

**Interfaces:**
- Consumes: `SNAPCHAT`, `assertSnapchatConfigured`, `redirectUri` from `@/server/env`; config constants; `ConnectedAccount, PublishInput, PublishResult, SocialConnector` from `./types`; `upsertAccounts` from `@/server/store`.
- Produces: `snapchatConnector` (with `getAuthUrl`, `exchangeCode`, `assertConfigured`, throwing `publish` stub); module helpers `snapGet`, `snapPost`, `exchangeCodeForTokens`, `refreshAccessToken`, `ensureFreshToken(account)`, `listPublicProfiles(token)`.

- [ ] **Step 1: Read the LinkedIn connector as the pattern to mirror**

Run: `sed -n '1,130p' src/server/connectors/linkedin.ts` — copy the shape of request helpers, OAuth exchange/refresh, `ensureFreshToken`, and the connector object. Confirm `upsertAccounts` is exported from `src/server/store.ts` (`grep -n 'export async function upsertAccounts' src/server/store.ts`).

- [ ] **Step 2: Create `snapchat.ts`**

```ts
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

async function snapGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${SNAP_API}/${SNAP_API_VERSION}${path}`, { headers: authHeaders(token), cache: 'no-store' });
  if (!res.ok) throw new Error(`Snapchat GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function snapPost<T>(token: string, path: string, body: unknown, json = true): Promise<T> {
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

async function exchangeCodeForTokens(code: string): Promise<ITokenResponse> {
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

async function refreshAccessToken(refreshToken: string): Promise<ITokenResponse> {
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
  const meta = (account.meta ?? {}) as Record<string, any>;
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
async function listPublicProfiles(token: string): Promise<{ id: string; name: string; orgId: string }[]> {
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
```

- [ ] **Step 3: Register in `registry.ts`**

```ts
import { snapchatConnector } from './snapchat';
// add to CONNECTORS:
  snapchat: snapchatConnector,
```

- [ ] **Step 4: Add `no_profiles` reason** in `app/api/connect/[platform]/callback/route.ts` — extend the existing `const reason =` ternary with `: platform === 'snapchat' ? 'no_profiles'`.

- [ ] **Step 5: Typecheck + clean build** — `npm run typecheck && rm -rf .next && npm run build` → PASS.
- [ ] **Step 6: Commit** — `git add src/server/connectors/snapchat.ts src/server/connectors/registry.ts "app/api/connect/[platform]/callback/route.ts" && git commit -m "feat(snapchat): OAuth, profile discovery, token refresh, connect wiring"`

---

## Task 3: Accounts UI — make Snapchat connectable

**Files:** Modify `src/modules/EpccDemo/screens/Accounts.tsx`

**Interfaces:** Consumes the generic connect flow + `/api/accounts`.

- [ ] **Step 1:** `grep -nE "CONNECTABLE|snapchat|linkedin|facebook" src/modules/EpccDemo/screens/Accounts.tsx` — find the `CONNECTABLE: TPlatformId[]` array (it already renders all platforms generically; LinkedIn was added this way).
- [ ] **Step 2:** Add `'snapchat'` to `CONNECTABLE`. `snapchat` is already a defined `TPlatformId` in `platforms.ts` with brand color/icon, so the chip/name/connect button/render all resolve automatically. Anchor on the real array; change nothing else.
- [ ] **Step 3: Typecheck** — PASS.
- [ ] **Step 4: Manual (optional, dev app):** `/epcc-demo/accounts` shows a Snapchat "Connect" option routing to `/api/connect/snapchat`.
- [ ] **Step 5: Commit** — `git add src/modules/EpccDemo/screens/Accounts.tsx && git commit -m "feat(snapchat): connectable in Accounts"`

---

# PHASE B — Publish + Delete

## Task 4: Media upload + publish (Story / Saved Story / Spotlight)

**Files:** Modify `src/server/connectors/snapchat.ts`

**Interfaces:**
- Consumes: `ensureFreshToken`, `snapGet`, `snapPost` (Task 2); `PublishInput.imageUrls` (added on the base branch).
- Produces: helpers `fetchBytes(url)`, `uploadMedia(account, bytes, kind)=>mediaId`; working `snapchatConnector.publish`.

- [ ] **Step 1: Add media upload + replace the publish stub**

> VERIFY against Snap Public Profile API docs: the media create/upload endpoints (register → upload bytes, chunked for large video, poll status) and the content-create endpoint + payload per content type (Story / Saved Story / Spotlight). Field names below follow the documented shape; adjust live and note changes.

```ts
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

// then, on the connector object, replace the publish stub:
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
```

- [ ] **Step 2: Typecheck + clean build** — `npm run typecheck && rm -rf .next && npm run build` → PASS.
- [ ] **Step 3: Commit** — `git add src/server/connectors/snapchat.ts && git commit -m "feat(snapchat): media upload + publish Story/Saved Story/Spotlight"`

---

## Task 5: deletePost

**Files:** Modify `src/server/connectors/snapchat.ts`

**Interfaces:** Consumes `ensureFreshToken`; adds `snapDelete`.

- [ ] **Step 1: Add `snapDelete` + `deletePost`**

```ts
async function snapDelete(token: string, path: string): Promise<void> {
  const res = await fetch(`${SNAP_API}/${SNAP_API_VERSION}${path}`, { method: 'DELETE', headers: authHeaders(token) });
  if (!res.ok && res.status !== 204) throw new Error(`Snapchat DELETE ${path} failed: ${res.status} ${await res.text()}`);
}

// on the connector object, after publish:
  async deletePost(account: ConnectedAccount, remoteId: string): Promise<void> {
    account = await ensureFreshToken(account);
    await snapDelete(account.accessToken, `/content/${encodeURIComponent(remoteId)}`); // VERIFY path
  },
```

- [ ] **Step 2: Typecheck** — PASS.
- [ ] **Step 3: Commit** — `git add src/server/connectors/snapchat.ts && git commit -m "feat(snapchat): delete content"`

---

## Task 6: Wire publishing into `publish.ts` + persist to the ledger

**Files:** Modify `src/modules/EpccDemo/_services/publish.ts`, `app/api/posts/publish/route.ts`

**Interfaces:** Consumes `snapchatConnector.publish`; `savePublishedPost` (already imported in the publish route for LinkedIn).

- [ ] **Step 1:** In `publish.ts`, add `'snapchat'` to `SUPPORTED`. In the per-platform payload mapping, give Snapchat the media (image via `imageUrls`/`imageUrl`, video via `videoUrl`) + `format`, resolving local `blob:`/`data:` via the existing `/api/upload` (`toPublic`) path. `grep -nE "SUPPORTED|toPublic|imageUrls|videoUrl|linkedin" src/modules/EpccDemo/_services/publish.ts` and anchor on the real code.
- [ ] **Step 2:** In `app/api/posts/publish/route.ts`, the LinkedIn block persists to the ledger `if (platform === 'linkedin' ...)`. Broaden it to also persist Snapchat: change the guard to `if ((platform === 'linkedin' || platform === 'snapchat') && result.remoteId)` (Snapchat posts, especially Stories, can't be reliably read back → keep them in the list). Anchor on the real block.
- [ ] **Step 3: Typecheck + clean build** — PASS.
- [ ] **Step 4: Commit** — `git add src/modules/EpccDemo/_services/publish.ts "app/api/posts/publish/route.ts" && git commit -m "feat(snapchat): wire into publisher + persist to ledger"`

---

# PHASE C — Read-back

## Task 7: getMetrics + getProfileStats

**Files:** Modify `src/server/connectors/snapchat.ts`

**Interfaces:** Consumes `ensureFreshToken`, `snapGet`. Produces `snapchatConnector.getMetrics` + exported `getProfileStats(account)`.

- [ ] **Step 1: Add read-back**

> VERIFY: the content-metrics + profile-insights endpoints and field names.

```ts
  async getMetrics(account: ConnectedAccount, remoteId: string): Promise<Record<string, number>> {
    account = await ensureFreshToken(account);
    const out: Record<string, number> = {};
    try {
      const r = await snapGet<{ stats?: Record<string, number> }>(account.accessToken, `/content/${encodeURIComponent(remoteId)}/stats`);
      const s = r.stats ?? {};
      for (const k of ['views', 'impressions', 'screenshots', 'swipes', 'shares'] as const) {
        if (typeof s[k] === 'number') out[k] = s[k];
      }
    } catch { /* metric unavailable — omit */ }
    return out;
  },
```

And a module-level export:

```ts
export async function getProfileStats(account: ConnectedAccount): Promise<{ followers?: number }> {
  const fresh = await ensureFreshToken(account);
  try {
    const r = await snapGet<{ public_profile?: { subscriber_count?: number } }>(fresh.accessToken, `/public_profiles/${fresh.accountId}`);
    const n = r.public_profile?.subscriber_count;
    return typeof n === 'number' ? { followers: n } : {};
  } catch {
    return {};
  }
}
```

- [ ] **Step 2: Typecheck** — PASS.
- [ ] **Step 3: Commit** — `git add src/server/connectors/snapchat.ts && git commit -m "feat(snapchat): read-back getMetrics + getProfileStats"`

---

## Task 8: Surface Snapchat in the analytics routes

**Files:** Modify `app/api/overview/route.ts`, `app/api/metrics/route.ts`, `app/api/report/route.ts`

**Interfaces:** Consumes `getProfileStats` (Task 7); `listAccounts()`.

- [ ] **Step 1:** `grep -nE "linkedin|getOrgStats|platform ===|listAccounts|snapchat" app/api/overview/route.ts app/api/metrics/route.ts app/api/report/route.ts` — find the LinkedIn branch added in the LinkedIn work; mirror it for `snapchat` using `getProfileStats` (followers) into the same per-platform result shape. Absent Snap-specific fields left absent (empty-state). Keep `getCached` wrappers; leave Meta/LinkedIn paths untouched.
- [ ] **Step 2:** In the metrics route's `metricCards`/aggregate, ensure `snapchat` is handled like `linkedin` (its own branch; do NOT let it dilute averages — the LinkedIn fix already filters null engagement rates, so Snapchat contributing no engagement rate is naturally excluded).
- [ ] **Step 3: Typecheck + clean build** — PASS.
- [ ] **Step 4: Commit** — `git add "app/api/overview/route.ts" "app/api/metrics/route.ts" "app/api/report/route.ts" && git commit -m "feat(snapchat): surface profile stats in overview/metrics/report"`

---

## Self-Review

**Spec coverage:**
- §2 files → Tasks 1-8 ✓
- §3 OAuth + profile discovery + refresh → Task 2 ✓
- §4 publish all types + delete → Tasks 4-5 ✓; publisher + ledger → Task 6 ✓
- §5 read-back → Task 7 ✓; analytics surfacing → Task 8 ✓; Accounts → Task 3 ✓
- §6 phasing A/B/C → task groups ✓
- §8 limits (scheduling ignored, ephemeral→ledger, approval gate) → encoded (format map, ledger persist, Global Constraints) ✓

**Placeholder scan:** No TBD/TODO; every code step has real code. `// VERIFY` notes are explicit live-check instructions (Snap endpoint/field names can differ) — required for this integration, consistent with the LinkedIn build-green approach.

**Type consistency:** `ConnectedAccount`/`PublishInput`(+`imageUrls`)/`PublishResult`/`SocialConnector`(+`assertConfigured?`) used consistently. Helper signatures match across tasks: `ensureFreshToken(account)→ConnectedAccount` (Task 2) consumed by 4/5/7; `uploadMedia(account,bytes,kind)→mediaId` (Task 4) consumed by publish; `getProfileStats(account)→{followers?}` (Task 7) consumed by Task 8. `accountId` = public profile id; `meta.organizationId` used for org-scoped media/discovery.

**Known soft spots (flagged in-task):** Snap API exact endpoints/field names (`// VERIFY` throughout) — discovery, media upload/chunking, content-create per type, delete, stats. Runtime needs a Snap Business app + Public Profile; tasks gate on typecheck + clean build only.
