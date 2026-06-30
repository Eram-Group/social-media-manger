# LinkedIn Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full LinkedIn Organization-Page `SocialConnector` (OAuth + token refresh, publish all formats, delete, read-back) wired into the app's connect routes, publisher, and analytics.

**Architecture:** A new `src/server/connectors/linkedin.ts` implementing the existing `SocialConnector` interface against LinkedIn's versioned REST **Posts API**, registered in the connector registry. Two small shared-infra changes — a per-connector `assertConfigured?()` (replacing the Meta-hardcoded config check in the connect route) and connector-owned token refresh (refresh token stored in `ConnectedAccount.meta`). Delivered in 3 phases: Connect → Publish/Delete → Read-back.

**Tech Stack:** Next.js 14 App Router (route handlers), TypeScript 5, `@neondatabase/serverless` (via existing `src/server/store.ts`), LinkedIn REST API (`api.linkedin.com/rest/*`).

## Global Constraints

- LinkedIn REST base `https://api.linkedin.com/rest`; every call sends headers `LinkedIn-Version: <YYYYMM>` (from `LINKEDIN_VERSION`), `X-Restli-Protocol-Version: 2.0.0`, `Authorization: Bearer <token>`. OAuth host is `https://www.linkedin.com/oauth/v2`.
- Server-only: LinkedIn secrets read from `process.env`, NEVER prefixed `NEXT_PUBLIC_`; tokens never returned to the browser (reuse `toPublic()` stripping in `store.ts`).
- Org posting only: `author` is always `urn:li:organization:{id}`. Scopes: `w_organization_social r_organization_social rw_organization_admin openid profile`.
- Token refresh: refresh token in `ConnectedAccount.meta.refreshToken` (+ `refreshTokenExpiresAt`); `ensureFreshToken(account)` refreshes within a 5-day buffer and `upsertAccounts` the result. Refresh-token-expired → throw `Error('LinkedIn authorization expired — reconnect the Page in Accounts.')`.
- Empty/absent metrics → omit the field (never zero-fill); UI shows existing empty states.
- `scheduledPublishTime` is ignored for LinkedIn (Posts API has no native scheduling). `format` values `reel`/`story` → normal feed post.
- Naming: interfaces `IXxx`, types `TXxx`, enums `EXxx`. Match the style of `meta.ts`/`instagram.ts`.
- No unit-test framework exists; verification is `npm run typecheck` + a clean `npm run build` (`rm -rf .next` first — stale cache gives a false PageNotFoundError). Runtime behavior is verified manually against a LinkedIn **dev app** (env `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`) where noted; tasks that can't run live still must pass typecheck/build.
- LinkedIn API request/response shapes in this plan are from the design spec; the implementer MUST confirm each against current LinkedIn docs / the dev app and adjust field names if LinkedIn has changed them — without fabricating data.
- Branch: `feat/linkedin-connector` (already created off latest origin/main; spec already committed).

---

## File Structure

**New**
- `src/server/connectors/linkedin.config.ts` — `LINKEDIN_VERSION`, `LINKEDIN_SCOPES`, REST/OAuth base URLs, endpoint path helpers.
- `src/server/connectors/linkedin.ts` — API helper layer (request wrappers, OAuth, refresh, asset upload, org discovery) + `linkedinConnector: SocialConnector`.

**Modified**
- `src/server/env.ts` — `LINKEDIN` config + `assertLinkedInConfigured()`.
- `src/server/connectors/types.ts` — optional `assertConfigured?()` on `SocialConnector`; `imageUrls?: string[]` on `PublishInput`.
- `src/server/connectors/facebook.ts`, `instagram.ts` — add `assertConfigured`.
- `src/server/connectors/registry.ts` — register `linkedin`.
- `app/api/connect/[platform]/route.ts` — per-connector config check.
- `app/api/connect/[platform]/callback/route.ts` — `no_orgs` empty reason for linkedin.
- `app/api/posts/publish/route.ts` — pass multi-image (`imageUrls`) through to the connector.
- `src/modules/EpccDemo/_services/publish.ts` — `SUPPORTED += 'linkedin'`; map media/link.
- `src/modules/EpccDemo/screens/Accounts.tsx` — LinkedIn connect/disconnect + token health.
- `app/api/overview/route.ts`, `app/api/report/route.ts`, `app/api/metrics/route.ts` — branch by `account.platform`, merge LinkedIn stats.

---

# PHASE A — Foundation + Connect

## Task 1: LinkedIn config + env

**Files:**
- Create: `src/server/connectors/linkedin.config.ts`
- Modify: `src/server/env.ts`

**Interfaces:**
- Produces: `LINKEDIN_VERSION: string`, `LINKEDIN_SCOPES: string`, `LI_REST = 'https://api.linkedin.com/rest'`, `LI_OAUTH = 'https://www.linkedin.com/oauth/v2'` (from config); `LINKEDIN = { clientId, clientSecret }`, `assertLinkedInConfigured()` (from env).

- [ ] **Step 1: Create `linkedin.config.ts`**

```ts
// LinkedIn REST API constants. Bump LINKEDIN_VERSION (YYYYMM) when LinkedIn
// deprecates it — same maintenance posture as META_GRAPH_VERSION.
export const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202401';
export const LI_REST = 'https://api.linkedin.com/rest';
export const LI_OAUTH = 'https://www.linkedin.com/oauth/v2';

// Org-page posting + read-back + follower stats, plus the user identity scopes.
export const LINKEDIN_SCOPES = [
  'w_organization_social',
  'r_organization_social',
  'rw_organization_admin',
  'openid',
  'profile',
].join(' ');
```

- [ ] **Step 2: Add LinkedIn config to `env.ts`** (after the `META` block)

```ts
export const LINKEDIN = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
};

export function assertLinkedInConfigured(): void {
  if (!LINKEDIN.clientId || !LINKEDIN.clientSecret) {
    throw new Error(
      'LinkedIn is not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your .env / .env.local.',
    );
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/server/connectors/linkedin.config.ts src/server/env.ts
git commit -m "feat(linkedin): add LinkedIn REST config + env"
```

---

## Task 2: Per-connector config check (shared-infra refactor)

**Files:**
- Modify: `src/server/connectors/types.ts`, `facebook.ts`, `instagram.ts`, `app/api/connect/[platform]/route.ts`

**Interfaces:**
- Consumes: `assertMetaConfigured` from `@/server/env`.
- Produces: `SocialConnector.assertConfigured?(): void`.

- [ ] **Step 1: Add `assertConfigured?()` to the interface** (`types.ts`, in the `SocialConnector` interface, after `id`)

```ts
  // Validate this connector's required env config; throws a user-facing error if missing.
  assertConfigured?(): void;
```

- [ ] **Step 2: Adopt it in the Meta connectors**

In `facebook.ts` and `instagram.ts`, import `assertMetaConfigured` from `@/server/env` (if not already imported) and add to each connector object:

```ts
  assertConfigured: assertMetaConfigured,
```

- [ ] **Step 3: Swap the connect route's hardcoded check** (`app/api/connect/[platform]/route.ts`)

Replace the `try { assertMetaConfigured(); } catch ...` block (lines ~11-15) with a per-connector check, and remove the now-unused `assertMetaConfigured` import:

```ts
  try {
    getConnector(platform).assertConfigured?.();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Manual sanity (no dev app needed)**

Run `npm run dev`; open `http://localhost:3000/api/connect/facebook`. Expected: still redirects to Meta OAuth (or returns the Meta-not-configured error if META env unset) — behavior unchanged for Meta.

- [ ] **Step 6: Commit**

```bash
git add src/server/connectors/types.ts src/server/connectors/facebook.ts src/server/connectors/instagram.ts app/api/connect/[platform]/route.ts
git commit -m "refactor(connectors): per-connector assertConfigured() in connect route"
```

---

## Task 3: LinkedIn OAuth + org discovery + token refresh + connect wiring

**Files:**
- Create: `src/server/connectors/linkedin.ts`
- Modify: `src/server/connectors/registry.ts`, `app/api/connect/[platform]/callback/route.ts`

**Interfaces:**
- Consumes: `LINKEDIN`, `assertLinkedInConfigured`, `redirectUri` from `@/server/env`; `LI_REST`, `LI_OAUTH`, `LINKEDIN_VERSION`, `LINKEDIN_SCOPES` from `./linkedin.config`; `ConnectedAccount`, `PublishInput`, `PublishResult`, `SocialConnector` from `./types`; `upsertAccounts` from `@/server/store`.
- Produces: `linkedinConnector: SocialConnector` (with `getAuthUrl`, `exchangeCode`, `assertConfigured`, and a `publish` that throws "not implemented" until Task 6); internal helpers `liGet/liPost`, `exchangeCodeForTokens`, `refreshAccessToken`, `ensureFreshToken(account)`, `listAdminOrgs(token)`.

- [ ] **Step 1: Create `linkedin.ts` request helpers + OAuth + refresh + org discovery + connector skeleton**

```ts
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
        refreshTokenExpiresAt: t.refresh_token_expires_in ? now + t.refresh_token_expires_in : null,
        vanityName: o.vanityName,
      },
    }));
  },

  async publish(_account: ConnectedAccount, _input: PublishInput): Promise<PublishResult> {
    // Implemented in Phase B (Task 6).
    throw new Error('LinkedIn publishing is not implemented yet.');
  },
};
```

- [ ] **Step 2: Register the connector** (`registry.ts`)

Import and add to the `CONNECTORS` map:

```ts
import { linkedinConnector } from './linkedin';
// ...
const CONNECTORS: Partial<Record<TPlatformId, SocialConnector>> = {
  facebook: facebookConnector,
  instagram: instagramConnector,
  linkedin: linkedinConnector,
};
```

- [ ] **Step 3: Add the `no_orgs` empty reason** (`app/api/connect/[platform]/callback/route.ts`, line ~32)

Replace the reason line with a linkedin-aware version:

```ts
      const reason = platform === 'instagram' ? 'no_ig_account'
        : platform === 'linkedin' ? 'no_orgs'
        : 'no_pages';
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck && rm -rf .next && npm run build`
Expected: PASS.

- [ ] **Step 5: Manual verify (needs a LinkedIn dev app + LINKEDIN_CLIENT_ID/SECRET in .env.local, redirect URI `http://localhost:3000/api/connect/linkedin/callback` registered)**

Run `npm run dev`; visit `http://localhost:3000/api/connect/linkedin`. Expected: redirect to LinkedIn consent; after approving, redirect to `/epcc-demo/accounts?connected=linkedin&count=N` and the org persisted (check `connected_accounts`). If LINKEDIN env is unset: `GET /api/connect/linkedin` returns the "LinkedIn is not configured" error (proves Task 2 wiring). Note in your report which path you exercised.

- [ ] **Step 6: Commit**

```bash
git add src/server/connectors/linkedin.ts src/server/connectors/registry.ts app/api/connect/[platform]/callback/route.ts
git commit -m "feat(linkedin): OAuth, admin-org discovery, token refresh, connect wiring"
```

---

## Task 4: Accounts UI — LinkedIn connect/disconnect + token health

**Files:**
- Modify: `src/modules/EpccDemo/screens/Accounts.tsx`

**Interfaces:**
- Consumes: the existing `/api/accounts` (GET list / DELETE) and the generic `/api/connect/linkedin` OAuth entry.

- [ ] **Step 1: Inspect how Accounts renders connectable platforms + connected accounts**

Run: `grep -nE "connect/|facebook|instagram|platform|Connect|reconnect|/api/accounts|map\(" src/modules/EpccDemo/screens/Accounts.tsx | head -40`
Identify (a) the list of connectable platforms and the "Connect" affordance, and (b) where connected accounts render (name + follower count).

- [ ] **Step 2: Surface LinkedIn**

- Ensure `linkedin` appears as a connectable platform whose "Connect" action navigates to `/api/connect/linkedin` (same mechanism Facebook/Instagram use — reuse it; do not hand-roll a new flow).
- Render a connected LinkedIn account like the others (PlatformChip + name + `formatFollowers(followers)` when present).
- Show a **reconnect** affordance when a LinkedIn account's token is unhealthy. If `/api/accounts` doesn't already expose token health, surface a generic "Reconnect" link to `/api/connect/linkedin` on LinkedIn accounts (the connect flow re-authorizes and `upsertAccounts` refreshes the token). Keep this minimal — no new API needed.

Anchor edits on the real code from Step 1; match the existing per-platform rendering. Do not restructure the screen.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Manual verify**

`/epcc-demo/accounts` shows a LinkedIn "Connect" option; after connecting (dev app), the org appears with its name (and follower count once read-back lands in Phase C). Disconnect (DELETE) removes it.

- [ ] **Step 5: Commit**

```bash
git add src/modules/EpccDemo/screens/Accounts.tsx
git commit -m "feat(linkedin): connect/disconnect + reconnect in Accounts"
```

---

# PHASE B — Publish + Delete

## Task 5: PublishInput multi-image field + asset upload helpers

**Files:**
- Modify: `src/server/connectors/types.ts`, `src/server/connectors/linkedin.ts`

**Interfaces:**
- Produces: `PublishInput.imageUrls?: string[]`; helpers `uploadImage(account, bytes): Promise<string>` (returns image URN), `uploadVideo(account, bytes): Promise<string>` (returns video URN, polled to AVAILABLE), and `fetchBytes(url): Promise<Uint8Array>`.

- [ ] **Step 1: Add `imageUrls?` to `PublishInput`** (`types.ts`, in the `PublishInput` interface)

```ts
  imageUrls?: string[];          // multiple public image URLs (multi-image post)
```

- [ ] **Step 2: Add asset upload helpers to `linkedin.ts`**

> VERIFY against current LinkedIn docs: the Images API (`/images?action=initializeUpload`) and Videos API (`/videos?action=initializeUpload` → upload parts → `finalizeUpload` → poll `/videos/{urn}` until `status === 'AVAILABLE'`). Field names below follow the documented shapes; adjust if LinkedIn changed them, and note any change in your report.

```ts
async function fetchBytes(url: string): Promise<Uint8Array> {
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
    body: bytes,
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
      body: bytes,
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
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (Helpers are exported but not yet called — Task 6 wires them; if `noUnusedLocals` flags them, that's fine since they're `export`ed.)

- [ ] **Step 4: Commit**

```bash
git add src/server/connectors/types.ts src/server/connectors/linkedin.ts
git commit -m "feat(linkedin): PublishInput.imageUrls + image/video asset upload helpers"
```

---

## Task 6: Implement `publish` (all formats)

**Files:**
- Modify: `src/server/connectors/linkedin.ts`

**Interfaces:**
- Consumes: `ensureFreshToken`, `uploadImage`, `uploadVideo`, `fetchBytes`, `liPost` (Task 3/5).
- Produces: working `linkedinConnector.publish(account, input)` returning `{ remoteId, url, raw }`.

- [ ] **Step 1: Replace the `publish` stub with the real implementation**

> VERIFY against current LinkedIn Posts API docs: `POST /rest/posts`; the created post URN comes back in the `x-restli-id` response header. `content` shapes: `article`, `media: { id }`, `multiImage: { images: [{ id }] }`. Adjust field names if LinkedIn changed them; note changes in your report.

```ts
  async publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult> {
    account = await ensureFreshToken(account);

    // Resolve content by format (priority: video > multi-image > single image > link > text).
    let content: Record<string, unknown> | undefined;

    if (input.videoUrl || input.videoBlob) {
      const bytes = input.videoBlob
        ? new Uint8Array(await input.videoBlob.arrayBuffer())
        : await fetchBytes(input.videoUrl!);
      const videoUrn = await uploadVideo(account, bytes);
      content = { media: { id: videoUrn } };
    } else if (input.imageUrls && input.imageUrls.length > 1) {
      const urns: string[] = [];
      for (const u of input.imageUrls) urns.push(await uploadImage(account, await fetchBytes(u)));
      content = { multiImage: { images: urns.map((id) => ({ id })) } };
    } else if (input.imageUrl || input.imageBlob || (input.imageUrls && input.imageUrls.length === 1)) {
      const url = input.imageUrl ?? input.imageUrls?.[0];
      const bytes = input.imageBlob
        ? new Uint8Array(await input.imageBlob.arrayBuffer())
        : await fetchBytes(url!);
      const imageUrn = await uploadImage(account, bytes);
      content = { media: { id: imageUrn } };
    } else if (input.link) {
      content = { article: { source: input.link } };
    }

    const body: Record<string, unknown> = {
      author: account.accountId,
      commentary: input.message ?? '',
      visibility: 'PUBLIC',
      lifecycleState: 'PUBLISHED',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      ...(content ? { content } : {}),
    };

    const { data, restliId } = await liPost<{ id?: string }>(account.accessToken, '/posts', body);
    const postUrn = restliId ?? data.id ?? '';
    return {
      remoteId: postUrn,
      url: postUrn ? `https://www.linkedin.com/feed/update/${postUrn}` : undefined,
      raw: data,
    };
  },
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && rm -rf .next && npm run build`
Expected: PASS.

- [ ] **Step 3: Manual verify (dev app)**

With a connected org, POST to `/api/posts/publish` (or via the Composer once Task 8 lands) a text post, an image post, a multi-image post, and a video post. Expected: each appears on the org Page; the returned `url` opens the post. (If you can't run live yet, state that and rely on typecheck/build.)

- [ ] **Step 4: Commit**

```bash
git add src/server/connectors/linkedin.ts
git commit -m "feat(linkedin): publish text/link/image/multi-image/video via Posts API"
```

---

## Task 7: Implement `deletePost`

**Files:**
- Modify: `src/server/connectors/linkedin.ts`

**Interfaces:**
- Consumes: `ensureFreshToken`, `headers` (Task 3).
- Produces: `linkedinConnector.deletePost(account, remoteId)`.

- [ ] **Step 1: Add a `liDelete` helper and the `deletePost` method**

Add the helper near `liGet`/`liPost`:

```ts
async function liDelete(token: string, path: string): Promise<void> {
  const res = await fetch(`${LI_REST}${path}`, { method: 'DELETE', headers: headers(token) });
  if (!res.ok && res.status !== 204) throw new Error(`LinkedIn DELETE ${path} failed: ${res.status} ${await res.text()}`);
}
```

Add to the connector object (after `publish`):

```ts
  async deletePost(account: ConnectedAccount, remoteId: string): Promise<void> {
    account = await ensureFreshToken(account);
    await liDelete(account.accessToken, `/posts/${encodeURIComponent(remoteId)}`);
  },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verify (dev app)**

Publish then delete a post via `/api/posts/delete` (the route resolves the connector). Expected: the post disappears from the Page.

- [ ] **Step 4: Commit**

```bash
git add src/server/connectors/linkedin.ts
git commit -m "feat(linkedin): delete org posts"
```

---

## Task 8: Wire publishing into `publish.ts` + the publish route

**Files:**
- Modify: `src/modules/EpccDemo/_services/publish.ts`, `app/api/posts/publish/route.ts`

**Interfaces:**
- Consumes: `PublishInput.imageUrls`, the connector `publish` (Tasks 5-6).

- [ ] **Step 1: Add `linkedin` to `SUPPORTED` and map media** (`publish.ts`)

- Change `const SUPPORTED: TPlatformId[] = ['facebook', 'instagram'];` → add `'linkedin'`.
- Where the post is mapped to the publish payload per platform, ensure for LinkedIn the **full media array** is passed as `imageUrls` (so multi-image works), the first video as `videoUrl`, and `link` from the post. Read the file first (`grep -nE "SUPPORTED|imageUrl|videoUrl|firstImage|media|publish" src/modules/EpccDemo/_services/publish.ts`) and extend the existing mapping; anchor on real code. Resolve local `blob:`/`data:` images via the existing `/api/upload` path that the file already uses for FB/IG.

- [ ] **Step 2: Pass multi-image through the publish API route** (`app/api/posts/publish/route.ts`)

Read the route (`grep -nE "imageUrl|videoUrl|imageUrls|PublishInput|publish\(|formData|json" app/api/posts/publish/route.ts`). Ensure the route forwards an `imageUrls` array (JSON body) and/or multiple uploaded files into `PublishInput.imageUrls` when present, in addition to the existing single-image path. Keep the existing FB/IG behavior unchanged. Anchor on real code.

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && rm -rf .next && npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verify (dev app)**

In the Composer, select LinkedIn (+ optionally FB/IG), attach 2+ images, publish. Expected: a multi-image post appears on the org Page; the Composer shows success + permalink for LinkedIn.

- [ ] **Step 5: Commit**

```bash
git add src/modules/EpccDemo/_services/publish.ts app/api/posts/publish/route.ts
git commit -m "feat(linkedin): wire LinkedIn into the publisher (incl. multi-image)"
```

---

# PHASE C — Read-back

## Task 9: `getMetrics` + `getOrgStats`

**Files:**
- Modify: `src/server/connectors/linkedin.ts`

**Interfaces:**
- Consumes: `ensureFreshToken`, `liGet` (Task 3).
- Produces: `linkedinConnector.getMetrics(account, remoteId): Promise<Record<string, number>>`; exported `getOrgStats(account): Promise<{ followers?: number }>`.

- [ ] **Step 1: Add `getMetrics` (per-post) and `getOrgStats` (org followers)**

> VERIFY against current LinkedIn docs: `/socialActions/{urn}` (likes/comments summaries), `/organizationalEntityShareStatistics` (impressions/clicks/shares/engagement), `/networkSizes/{orgUrn}?edgeType=COMPANY_FOLLOWED_BY_MEMBER` (firstDegreeSize). Adjust field names if changed; never zero-fill an absent metric — omit it.

Add to the connector object:

```ts
  async getMetrics(account: ConnectedAccount, remoteId: string): Promise<Record<string, number>> {
    account = await ensureFreshToken(account);
    const out: Record<string, number> = {};
    try {
      const sa = await liGet<{ likesSummary?: { totalLikes?: number }; commentsSummary?: { totalComments?: number } }>(
        account.accessToken, `/socialActions/${encodeURIComponent(remoteId)}`,
      );
      if (typeof sa.likesSummary?.totalLikes === 'number') out.likes = sa.likesSummary.totalLikes;
      if (typeof sa.commentsSummary?.totalComments === 'number') out.comments = sa.commentsSummary.totalComments;
    } catch { /* metric unavailable — omit */ }
    try {
      const orgUrn = account.accountId;
      const stats = await liGet<{ elements?: { totalShareStatistics?: Record<string, number> }[] }>(
        account.accessToken,
        `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(orgUrn)}&shares=List(${encodeURIComponent(remoteId)})`,
      );
      const t = stats.elements?.[0]?.totalShareStatistics;
      if (t) {
        if (typeof t.impressionCount === 'number') out.impressions = t.impressionCount;
        if (typeof t.clickCount === 'number') out.clicks = t.clickCount;
        if (typeof t.shareCount === 'number') out.shares = t.shareCount;
        if (typeof t.engagement === 'number') out.engagement = t.engagement;
      }
    } catch { /* metric unavailable — omit */ }
    return out;
  },
```

And export an org-stats helper (module-level, after the connector):

```ts
export async function getOrgStats(account: ConnectedAccount): Promise<{ followers?: number }> {
  const fresh = await ensureFreshToken(account);
  try {
    const ns = await liGet<{ firstDegreeSize?: number }>(
      fresh.accessToken,
      `/networkSizes/${encodeURIComponent(fresh.accountId)}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`,
    );
    return { followers: ns.firstDegreeSize };
  } catch {
    return {};
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual verify (dev app)**

For a published post, call the connector path that exercises `getMetrics` (or temporarily log it from a route) → likes/comments return; `getOrgStats` returns a follower count. Note results in your report.

- [ ] **Step 4: Commit**

```bash
git add src/server/connectors/linkedin.ts
git commit -m "feat(linkedin): read-back getMetrics + getOrgStats"
```

---

## Task 10: Surface LinkedIn in analytics routes

**Files:**
- Modify: `app/api/overview/route.ts`, `app/api/metrics/route.ts`, `app/api/report/route.ts`

**Interfaces:**
- Consumes: `linkedinConnector.getMetrics`, `getOrgStats` (Task 9); `listAccounts()` from `@/server/store`.

- [ ] **Step 1: Inspect how each route iterates accounts**

Run: `grep -nE "listAccounts|platform|facebook|instagram|graphGet|for \(|map\(|getCached" app/api/overview/route.ts app/api/metrics/route.ts app/api/report/route.ts | head -50`
Identify where each route loops connected accounts and assumes Meta/Graph.

- [ ] **Step 2: Branch by platform; merge LinkedIn**

In each route's account loop, gate the existing Graph logic on `account.platform === 'facebook' || account.platform === 'instagram'`, and add a `account.platform === 'linkedin'` branch that builds the same per-platform result shape from `getOrgStats(account)` (followers) and, where the route shows per-post metrics, `linkedinConnector.getMetrics(account, postUrn)`. LinkedIn lacks FB/IG-specific fields (reach curves, demographics) — leave those absent so the screens' empty states render. Keep all results inside the existing `getCached` wrappers. Anchor on the real code from Step 1; do not restructure the Meta paths.

This task is the integration-heaviest; if a route's Meta coupling makes a clean LinkedIn branch infeasible without restructuring, implement the **followers + per-post engagement** surfacing (the high-value, low-risk subset) and report the rest as a documented follow-up rather than forcing a risky refactor.

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck && rm -rf .next && npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verify (dev app)**

With a connected + posted-to org, load Command Center / Analytics / Reports. Expected: LinkedIn appears with a follower count and per-post engagement where shown; FB/IG behavior unchanged; empty states where LinkedIn has no equivalent metric.

- [ ] **Step 5: Commit**

```bash
git add app/api/overview/route.ts app/api/metrics/route.ts app/api/report/route.ts
git commit -m "feat(linkedin): surface LinkedIn stats in overview/metrics/report"
```

---

## Self-Review

**Spec coverage:**
- §2 architecture / files → Tasks 1-10 cover every listed file ✓
- §2 shared-infra: per-connector config → Task 2 ✓; token refresh → Task 3 (`ensureFreshToken`) ✓
- §3 OAuth + org discovery + refresh → Task 3 ✓
- §4 publish all formats + delete → Tasks 5-7 ✓ (multi-image via `PublishInput.imageUrls`, Task 5/8)
- §4 publisher/Composer wiring → Task 8 ✓
- §5 read-back getMetrics + getOrgStats → Task 9 ✓; UI surfacing (Accounts) → Task 4 ✓; analytics merge → Task 10 ✓
- §6 phasing A/B/C → tasks grouped accordingly ✓
- §8 limits (no scheduling/Stories, approval) → encoded as behavior (format mapping, scheduledPublishTime ignored) + Global Constraints ✓

**Placeholder scan:** No TBD/TODO. Each code step carries real code. The external-API "VERIFY against current docs" notes are explicit verification instructions (not vague hand-waving) — required for an integration whose exact field names can drift; the implementer confirms via docs/dev app and reports changes.

**Type consistency:** `ConnectedAccount`, `PublishInput` (+`imageUrls?`), `PublishResult`, `SocialConnector` (+`assertConfigured?`) used consistently. Helper signatures match across tasks: `ensureFreshToken(account)→ConnectedAccount` (Task 3) consumed by Tasks 6/7/9; `uploadImage/uploadVideo(account,bytes)→string URN` (Task 5) consumed by Task 6; `getOrgStats(account)→{followers?}` (Task 9) consumed by Task 10. `accountId` is always the org URN; metrics `remoteId` is the post URN.

**Known soft spots for the implementer (flagged in-task):**
- LinkedIn API field names/shapes (images/videos/posts/socialActions/statistics) must be verified against current docs — marked with "VERIFY" callouts.
- Task 10 is integration-heavy; the task authorizes a high-value subset (followers + per-post engagement) if a clean branch isn't feasible without restructuring the Meta paths.
- Runtime verification needs a LinkedIn dev app; tasks without live access still gate on typecheck + clean build.
