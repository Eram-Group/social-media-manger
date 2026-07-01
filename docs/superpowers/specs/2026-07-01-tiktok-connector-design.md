# TikTok Connector — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design) — pending implementation plan
**Scope:** Phase 2d of the connector roadmap. Branch `feat/tiktok-connector` off `dev`
(reuses shared `assertConfigured?()`, token refresh, and the published-posts ledger).

---

## 1. Problem & goals

Add a **TikTok connector** so the Chamber can publish organic content to its TikTok account and
read engagement back — same `SocialConnector` registry pattern as the others. TikTok's organic
surface is the **Content Posting API** (Direct Post) + **Display API** (read-back), with Login Kit
OAuth 2.0.

**Goals**
- Connect the Chamber's TikTok account via OAuth 2.0; persist tokens server-side; refresh.
- **Publish** video (PULL_FROM_URL from our Vercel Blob) and photo posts (Direct Post).
- **Read-back**: video stats + follower/account stats, surfaced in Accounts, Reports, Analytics.
- Reuse shared infra; keep the `SocialConnector` interface unchanged.
- Reuse the **published-posts ledger** (TikTok has no delete API and read-back is limited → keep
  posts in the app's list).

**Non-goals**
- No **delete** (TikTok provides no content-delete API).
- No ads / paid promotion (Business/Ads API is separate).
- No changes to the Meta/LinkedIn/Snapchat connectors' behavior.

**Target APIs:** Content Posting API + Display API at `https://open.tiktokapis.com/v2`; OAuth at
`https://www.tiktok.com/v2/auth/authorize` + `https://open.tiktokapis.com/v2/oauth/token`.

---

## 2. Architecture

New `SocialConnector`; the app dispatches through the registry.

### Files
**New**
- `src/server/connectors/tiktok.config.ts` — `TIKTOK_API='https://open.tiktokapis.com/v2'`,
  `TIKTOK_AUTH='https://www.tiktok.com/v2/auth/authorize'`, `TIKTOK_TOKEN='https://open.tiktokapis.com/v2/oauth/token'`,
  `TIKTOK_SCOPES`, content-type constants.
- `src/server/connectors/tiktok.ts` — helpers (`ttGet`/`ttPost`, OAuth exchange+refresh,
  `ensureFreshToken`, `getCreatorInfo`, publish (init→poll), `getMetrics`, `getUserStats`) +
  `tiktokConnector`.

**Modified**
- `src/server/env.ts` — `TIKTOK = { clientKey, clientSecret }` + `assertTiktokConfigured()`.
- `src/server/connectors/registry.ts` — register `tiktok`.
- `app/api/connect/[platform]/callback/route.ts` — `no_tiktok_account` empty reason.
- `src/modules/EpccDemo/_services/publish.ts` — `SUPPORTED += 'tiktok'` + media/format mapping.
- `app/api/posts/publish/route.ts` — persist tiktok posts to the ledger on success.
- `src/modules/EpccDemo/screens/Accounts.tsx` — add `tiktok` to `CONNECTABLE`.
- `app/api/overview/route.ts`, `app/api/metrics/route.ts`, `app/api/report/route.ts` — `tiktok` branch.

### Reused shared infra (on `dev`)
- `SocialConnector.assertConfigured?()`, connector-owned `ensureFreshToken`,
  `savePublishedPost`/`listPublishedPosts` (ledger), generic connect routes.

**TikTok naming note:** TikTok uses **`client_key`** (not `client_id`) in OAuth params + a
`client_secret`. The connector maps this internally.

---

## 3. OAuth & account discovery

### Authorization
`getAuthUrl(state)` → `https://www.tiktok.com/v2/auth/authorize` with `client_key`,
`redirect_uri=redirectUri('tiktok')`, `response_type=code`, `scope=TIKTOK_SCOPES`
(`user.info.basic,video.upload,video.publish` — comma-separated per TikTok), `state`.

The generic connect route already handles CSRF state + `assertConfigured`. Redirect URI
`{APP_BASE_URL}/api/connect/tiktok/callback` must be registered in the TikTok app.

### Token exchange + refresh
`exchangeCode(code)`:
1. POST `TIKTOK_TOKEN` (form-encoded: `client_key`, `client_secret`, `code`,
   `grant_type=authorization_code`, `redirect_uri`) → `{ access_token, expires_in, refresh_token,
   refresh_expires_in, open_id, scope }`.
2. `GET /user/info/?fields=open_id,display_name,avatar_url,follower_count` → account name.
3. Build one `ConnectedAccount`: `accountId = open_id`, `name = display_name`,
   `followers = follower_count`, `meta = { refreshToken }`, `tokenExpiresAt = now + expires_in`.
4. No account → `error=no_tiktok_account`.

`ensureFreshToken` refreshes (`grant_type=refresh_token`) within a buffer, `upsertAccounts`;
failure → throw `Error('TikTok authorization expired — reconnect in Accounts.')`.

> VERIFY: exact `user/info` field list + token response field names.

---

## 4. Publishing (Direct Post) — video & photo

TikTok Direct Post is a **3-step flow** (no single "post" call):
1. **`POST /post/publish/creator_info/query/`** — required first. Returns the creator's allowed
   `privacy_level_options`, and whether interactions (comment/duet/stitch) are allowed. Pick a
   valid `privacy_level` from the returned options (e.g. `SELF_ONLY` until audited, else
   `PUBLIC_TO_EVERYONE`).
2. **Init the post:**
   - Video: `POST /post/publish/video/init/` with
     `post_info: { title, privacy_level, disable_comment?, ... }` and
     `source_info: { source: 'PULL_FROM_URL', video_url: <public blob url> }`.
   - Photo: `POST /post/publish/content/init/` with `media_type: 'PHOTO'`,
     `post_mode: 'DIRECT_POST'`, `post_info`, and `source_info: { source: 'PULL_FROM_URL',
     photo_images: [<urls>] }`.
   - Returns a `publish_id`.
3. **Poll `POST /post/publish/status/fetch/`** with `publish_id` until `status` is
   `PUBLISH_COMPLETE` (or fail on `FAILED`), bounded with a timeout (like the IG/Snap poll).

`publish(account, input)`:
1. `account = await ensureFreshToken(account)`.
2. `creator_info` → choose privacy level.
3. Resolve media URL(s): use `input.videoUrl` (video) or `input.imageUrls`/`imageUrl` (photo).
   These are already public (Vercel Blob) via the existing `/api/upload` resolution in `publish.ts`.
4. Init (video or photo) → `publish_id` → poll → complete.
5. Return `{ remoteId: publish_id, raw }` (a public post URL isn't reliably returned; the ledger
   stores the record).
6. `scheduledPublishTime` ignored (no native scheduling).

`format` mapping: `video`/`reel`/`story` → video Direct Post; image/`post` with images → photo
Direct Post.

**No `deletePost`** — TikTok has no content-delete API (the connector omits the optional method).

> VERIFY (marked in code): exact endpoint paths, `source_info`/`post_info` field names, the
> `PULL_FROM_URL` **domain-verification** requirement (the Vercel Blob URL prefix must be verified
> in the TikTok developer portal), and the status-poll response shape.

---

## 5. Read-back (metrics) & account stats

`getMetrics(account, remoteId)` → `Record<string, number>`:
- Video stats via the Display API **Video Query** (`POST /video/query/` with the video id and
  `fields=like_count,comment_count,share_count,view_count`). Each guarded by `typeof === 'number'`;
  absent omitted.
  > Note: the Direct Post `publish_id` is not the same as the queryable **video id**; obtaining the
  > posted video id may require a `video/list` lookup. If the video id isn't resolvable from
  > `publish_id`, `getMetrics` returns `{}` (empty-state) — documented as a live follow-up.

`getUserStats(account)` → `{ followers?: number }` via `GET /user/info/?fields=follower_count`.

**Surfacing:** `/api/overview`, `/api/metrics`, `/api/report` add a `tiktok` branch contributing
followers (and video metrics where resolvable), mirroring the LinkedIn/Snapchat branches. Absent
fields empty-state; not zero-filled. Accounts shows the connected account + follower count.

---

## 6. Phasing (the plan sequences these)

- **Phase A — Foundation + Connect:** config + env + `assertTiktokConfigured`, registry,
  `tiktok.ts` OAuth (client_key) + `user/info` account + `ensureFreshToken`, callback branch,
  Accounts `CONNECTABLE`. *Deliverable: connect a real TikTok account (dev).*
- **Phase B — Publish:** `getCreatorInfo` + video/photo Direct Post (init → poll) + `publish.ts`/
  route wiring + ledger persist. *Deliverable: a real (SELF_ONLY until audited) post from the app.*
- **Phase C — Read-back:** `getMetrics` + `getUserStats` + analytics-route surfacing.

---

## 7. Testing & verification

- `npm run typecheck` + clean `npm run build` (`rm -rf .next` first) gate every task. Build-green;
  TikTok API field names/endpoints marked `// VERIFY`, confirmed live later against a TikTok dev
  app; no live calls during the build.
- Manual (when a TikTok dev app + audited posting exist): connect → creator_info → post video/photo
  (SELF_ONLY pre-audit) → poll complete → metrics.

---

## 8. Risks, limits & client expectations

- **Content-posting audit** — until TikTok approves the app, Direct Post is forced
  **`SELF_ONLY` (private)**. Audit ~1–2 weeks. **State this to the client.**
- **PULL_FROM_URL domain verification** — the media URL prefix (Vercel Blob) must be verified in
  the TikTok portal; otherwise use FILE_UPLOAD (chunked) as a fallback (a documented follow-up).
- **No delete** — TikTok has no content-delete API (ledger keeps the post in our list).
- **publish_id ≠ video id** — per-post metrics may need a `video/list` lookup (live follow-up).
- **Short-lived access tokens** → `ensureFreshToken` (refresh token required).
- Exact endpoints/fields verified live (`// VERIFY`) — same build-green posture as Snapchat.

---

## 9. Out of scope (later)
X (Twitter) connector — its own spec → plan (design already drafted in the master plan).
