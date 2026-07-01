# TikTok Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a TikTok `SocialConnector` (OAuth + refresh, publish video/photo via Direct Post, read-back) wired into connect routes, publisher (+ ledger), and analytics.

**Architecture:** New `src/server/connectors/tiktok.ts` implementing `SocialConnector` against TikTok's Content Posting API (Direct Post) + Display API. Reuses the shared `assertConfigured?()`, token refresh, and published-posts ledger. 3 phases: Connect → Publish → Read-back.

**Tech Stack:** Next.js 14, TypeScript 5, `@neondatabase/serverless` (via store.ts), TikTok API (`open.tiktokapis.com/v2`), OAuth (`www.tiktok.com/v2/auth/authorize`).

## Global Constraints

- API base `https://open.tiktokapis.com/v2`; OAuth authorize `https://www.tiktok.com/v2/auth/authorize`, token `https://open.tiktokapis.com/v2/oauth/token`. Bearer auth. TikTok uses **`client_key`** (+ `client_secret`).
- Server-only secrets (no `NEXT_PUBLIC_`); tokens never returned to browser (`toPublic` strips them).
- accountId = TikTok `open_id`; refresh token in `meta.refreshToken`; `ensureFreshToken` refreshes within a buffer, `upsertAccounts`, throws `Error('TikTok authorization expired — reconnect in Accounts.')` on failure.
- Absent metrics OMITTED, never zero-filled. FB/IG/LinkedIn/Snapchat behavior UNCHANGED (additive only).
- No `deletePost` (TikTok has no content-delete API). `scheduledPublishTime` ignored.
- **Build-green:** no unit-test framework — gate is `npm run typecheck` (+ clean `npm run build`, `rm -rf .next` first). Do NOT attempt live TikTok calls. TikTok endpoint/field names implemented per docs and marked `// VERIFY` for the user's later live testing.
- Branch: `feat/tiktok-connector` (off `dev`).

---

## File Structure

**New:** `src/server/connectors/tiktok.config.ts`, `src/server/connectors/tiktok.ts`
**Modified:** `env.ts`, `registry.ts`, `app/api/connect/[platform]/callback/route.ts`, `_services/publish.ts`, `app/api/posts/publish/route.ts`, `screens/Accounts.tsx`, `app/api/{overview,metrics,report}/route.ts`

---

# PHASE A — Foundation + Connect

## Task 1: config + env

**Files:** Create `src/server/connectors/tiktok.config.ts`; Modify `src/server/env.ts`
**Produces:** `TIKTOK_API`, `TIKTOK_AUTH`, `TIKTOK_TOKEN`, `TIKTOK_SCOPES`, `TTolContentType`; `TIKTOK={clientKey,clientSecret}`, `assertTiktokConfigured()`.

- [ ] **Step 1: `tiktok.config.ts`**
```ts
export const TIKTOK_API = 'https://open.tiktokapis.com/v2';
export const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize';
export const TIKTOK_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token';
// Comma-separated per TikTok. VERIFY against the app's granted scopes.
export const TIKTOK_SCOPES = 'user.info.basic,video.upload,video.publish';
export type TTikTokPostType = 'VIDEO' | 'PHOTO';
```
- [ ] **Step 2: `env.ts`** (after SNAPCHAT block)
```ts
export const TIKTOK = {
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
};
export function assertTiktokConfigured(): void {
  if (!TIKTOK.clientKey || !TIKTOK.clientSecret) {
    throw new Error('TikTok is not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in your .env / .env.local.');
  }
}
```
- [ ] **Step 3:** `npm run typecheck` → PASS.
- [ ] **Step 4:** Commit `feat(tiktok): add TikTok API config + env`

---

## Task 2: connector core — OAuth, account, token refresh, connect wiring

**Files:** Create `src/server/connectors/tiktok.ts`; Modify `registry.ts`, `app/api/connect/[platform]/callback/route.ts`
**Consumes:** `TIKTOK`, `assertTiktokConfigured`, `redirectUri`; config; types; `upsertAccounts`.
**Produces:** `tiktokConnector` (getAuthUrl/exchangeCode/assertConfigured + throwing publish stub); helpers `ttGet`, `ttPost`, `exchangeCodeForTokens`, `refreshAccessToken`, `ensureFreshToken`.

- [ ] **Step 1:** Read `src/server/connectors/snapchat.ts` (`sed -n '1,120p'`) to mirror the shape. Confirm `upsertAccounts` export.
- [ ] **Step 2: `tiktok.ts`**
```ts
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
```
- [ ] **Step 3: registry** — `import { tiktokConnector } from './tiktok';` + `tiktok: tiktokConnector,`.
- [ ] **Step 4: callback** — extend the `const reason =` ternary with `: platform === 'tiktok' ? 'no_tiktok_account'`.
- [ ] **Step 5:** `npm run typecheck && rm -rf .next && npm run build` → PASS.
- [ ] **Step 6:** Commit `feat(tiktok): OAuth, account, token refresh, connect wiring`

---

## Task 3: Accounts connectable

**Files:** Modify `src/modules/EpccDemo/screens/Accounts.tsx`
- [ ] **Step 1:** `grep -nE "CONNECTABLE|tiktok|snapchat" src/modules/EpccDemo/screens/Accounts.tsx` — read the array.
- [ ] **Step 2:** Add `'tiktok'` to `CONNECTABLE`. `tiktok` is already a `TPlatformId` (brand color/icon in platforms.ts). Nothing else.
- [ ] **Step 3:** `npm run typecheck` → PASS.
- [ ] **Step 4:** Commit `feat(tiktok): connectable in Accounts`

---

# PHASE B — Publish

## Task 4: creator_info + publish (video/photo Direct Post)

**Files:** Modify `src/server/connectors/tiktok.ts`
**Consumes:** `ensureFreshToken`, `ttPost`; `PublishInput.imageUrls`.
**Produces:** helper `getCreatorInfo(account)`; working `tiktokConnector.publish`.

- [ ] **Step 1: add creator_info + replace publish stub**

> VERIFY against TikTok Content Posting API docs: endpoint paths (`/post/publish/creator_info/query/`, `/post/publish/video/init/`, `/post/publish/content/init/`, `/post/publish/status/fetch/`), the `post_info`/`source_info` field names, `PULL_FROM_URL` (the media URL prefix must be domain-verified in the TikTok portal), and the status field values. Adjust live and note changes.

```ts
async function getCreatorInfo(account: ConnectedAccount): Promise<{ privacyLevel: string }> {
  const r = await ttPost<{ data?: { privacy_level_options?: string[] } }>(
    account.accessToken, '/post/publish/creator_info/query/', {},
  );
  const opts = r.data?.privacy_level_options ?? [];
  // Prefer PUBLIC when allowed; else the first allowed (SELF_ONLY pre-audit).
  const privacyLevel = opts.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : (opts[0] ?? 'SELF_ONLY');
  return { privacyLevel };
}

// on the connector object, replace the stub:
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
          source_info: { source: 'PULL_FROM_URL', video_url: videoUrl } },
      );
      publishId = init.data?.publish_id ?? '';
    } else {
      const photos = input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []);
      if (!photos.length) throw new Error('TikTok photo publish requires at least one public image URL.');
      const init = await ttPost<{ data?: { publish_id?: string } }>(
        account.accessToken, '/post/publish/content/init/',
        { media_type: 'PHOTO', post_mode: 'DIRECT_POST',
          post_info: { title: input.message ?? '', privacy_level: privacyLevel },
          source_info: { source: 'PULL_FROM_URL', photo_images: photos } },
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
```
- [ ] **Step 2:** `npm run typecheck && rm -rf .next && npm run build` → PASS.
- [ ] **Step 3:** Commit `feat(tiktok): creator_info + publish video/photo (Direct Post)`

---

## Task 5: Wire publishing into publish.ts + ledger

**Files:** Modify `src/modules/EpccDemo/_services/publish.ts`, `app/api/posts/publish/route.ts`
- [ ] **Step 1:** In `publish.ts`, add `'tiktok'` to `SUPPORTED`; give TikTok the media (video via `videoUrl`, photos via `imageUrls`) + format, mirroring Snapchat (local blobs resolved via `/api/upload`/`toPublic`). `grep -nE "SUPPORTED|toPublic|imageUrls|videoUrl|snapchat" src/modules/EpccDemo/_services/publish.ts` and anchor.
- [ ] **Step 2:** In `app/api/posts/publish/route.ts`, broaden the ledger-persist guard to include tiktok: `if ((platform === 'linkedin' || platform === 'snapchat' || platform === 'tiktok') && result.remoteId)`. Anchor on the real block.
- [ ] **Step 3:** `npm run typecheck && rm -rf .next && npm run build` → PASS.
- [ ] **Step 4:** Commit `feat(tiktok): wire into publisher + persist to ledger`

---

# PHASE C — Read-back

## Task 6: getMetrics + getUserStats

**Files:** Modify `src/server/connectors/tiktok.ts`
**Produces:** `tiktokConnector.getMetrics` + exported `getUserStats(account)`.

- [ ] **Step 1: add read-back**

> VERIFY: the Video Query endpoint + fields, and that `publish_id` can be resolved to a queryable video id (if not, `getMetrics` returns `{}` — documented follow-up).

```ts
  async getMetrics(account: ConnectedAccount, remoteId: string): Promise<Record<string, number>> {
    account = await ensureFreshToken(account);
    const out: Record<string, number> = {};
    try {
      const r = await ttPost<{ data?: { videos?: Record<string, number>[] } }>(
        account.accessToken, '/video/query/?fields=like_count,comment_count,share_count,view_count',
        { filters: { video_ids: [remoteId] } },
      );
      const v = r.data?.videos?.[0] ?? {};
      for (const k of ['view_count', 'like_count', 'comment_count', 'share_count'] as const) {
        if (typeof v[k] === 'number') out[k] = v[k];
      }
    } catch { /* metric unavailable — omit */ }
    return out;
  },
```
And module-level:
```ts
export async function getUserStats(account: ConnectedAccount): Promise<{ followers?: number }> {
  const fresh = await ensureFreshToken(account);
  try {
    const r = await ttGet<{ data?: { user?: { follower_count?: number } } }>(fresh.accessToken, '/user/info/?fields=follower_count');
    const n = r.data?.user?.follower_count;
    return typeof n === 'number' ? { followers: n } : {};
  } catch { return {}; }
}
```
- [ ] **Step 2:** `npm run typecheck` → PASS.
- [ ] **Step 3:** Commit `feat(tiktok): read-back getMetrics + getUserStats`

---

## Task 7: Surface TikTok in analytics routes

**Files:** Modify `app/api/overview/route.ts`, `app/api/metrics/route.ts`, `app/api/report/route.ts`
- [ ] **Step 1:** `grep -nE "snapchat|getProfileStats|getUserStats|platform ===|listAccounts|tiktok" app/api/overview/route.ts app/api/metrics/route.ts app/api/report/route.ts` — read the snapchat branch; add a parallel `tiktok` branch using `getUserStats` (followers) into the same per-platform shape. Absent fields empty; getCached preserved; Meta/LinkedIn/Snapchat paths untouched; tiktok not zero-filled into the engagement-rate average (existing null-filter excludes it).
- [ ] **Step 2:** `npm run typecheck && rm -rf .next && npm run build` → PASS.
- [ ] **Step 3:** Commit `feat(tiktok): surface follower stats in overview/metrics/report`

---

## Self-Review

**Spec coverage:** §2 files → Tasks 1-7 ✓ · §3 OAuth/account/refresh → Task 2 ✓ · §4 creator_info + publish video/photo → Task 4 ✓; publisher+ledger → Task 5 ✓ · §5 read-back → Task 6 ✓, analytics → Task 7 ✓, Accounts → Task 3 ✓ · §6 phasing ✓ · §8 limits (no delete, audit SELF_ONLY, PULL_FROM_URL verify, publish_id≠video_id) → encoded (omit deletePost, `// VERIFY`, empty-state) ✓.

**Placeholder scan:** No TBD/TODO; real code each step. `// VERIFY` = explicit live-check instructions (TikTok endpoint/field names), required for this integration, consistent with Snapchat.

**Type consistency:** `ConnectedAccount`/`PublishInput`(+imageUrls)/`PublishResult`/`SocialConnector`(+assertConfigured?) consistent. `ensureFreshToken(account)→ConnectedAccount` (Task 2) consumed by 4/6; `getCreatorInfo(account)→{privacyLevel}` (Task 4) used by publish; `getUserStats(account)→{followers?}` (Task 6) consumed by Task 7. `accountId` = open_id; no `deletePost` (TikTok has no API — optional method omitted).

**Known soft spots (flagged):** TikTok endpoints/fields (`// VERIFY`): user/info shape, publish endpoints/payloads, PULL_FROM_URL domain verification, status values, publish_id→video_id for metrics. Runtime needs a TikTok dev app + audit; tasks gate on typecheck + clean build.
