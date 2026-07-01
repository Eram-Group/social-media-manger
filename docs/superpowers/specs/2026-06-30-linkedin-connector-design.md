# LinkedIn Connector — Design Spec

**Date:** 2026-06-30
**Status:** Approved (design) — pending implementation plan
**Scope:** Phase 2a of the connector roadmap (Snapchat, TikTok, X follow as their own specs).

---

## 1. Problem & goals

EPCC's platform currently has real connectors for **Facebook + Instagram** only. The Chamber
also maintains a **LinkedIn Organization (Company) Page**. This spec adds a full **LinkedIn
`SocialConnector`** so the Chamber can connect its Page, publish all supported post formats,
delete posts, and read engagement back into Reports/Analytics — using the **same registry
pattern** the Meta connectors already prove.

**Goals**
- Connect the Chamber's LinkedIn **Organization Page** via OAuth (the authorizing user must be a
  Page **admin**); persist tokens server-side.
- **Publish** text, single image, multi-image, video, and article/link posts to the org Page.
- **Delete** org posts.
- **Read-back**: per-post engagement (likes/comments/shares/impressions) + org follower count,
  surfaced in Accounts, Reports, Analytics, and Command Center.
- Keep the shared `SocialConnector` interface largely unchanged; isolate LinkedIn specifics in
  `linkedin.ts`.
- Two small, justified shared-infra changes (config check + token refresh) so the platform is no
  longer hardwired to Meta.

**Non-goals**
- No Stories/Reels (LinkedIn has no equivalent).
- No member-profile posting (`w_member_social`) — org Page only.
- No paid/ads (LinkedIn Marketing/ads API) — organic only, like the FB/IG connectors.
- No change to how the Meta connectors behave.

**Target API:** LinkedIn **versioned REST API** (`https://api.linkedin.com/rest/*`) with a
`LinkedIn-Version: <YYYYMM>` header and `X-Restli-Protocol-Version: 2.0.0`, using the unified
**Posts API** (`/rest/posts`) — not the legacy `ugcPosts` API.

---

## 2. Architecture

LinkedIn is a new `SocialConnector` implementation. The rest of the app (connect routes, publish
endpoint, analytics) stays platform-agnostic and dispatches through the registry.

### Files

**New**
- `src/server/connectors/linkedin.ts` — the connector + a LinkedIn API helper layer:
  - request wrappers `liGet/liPost/liDelete` (base URL, version header, restli header, bearer auth)
  - OAuth: `exchangeCodeForTokens(code)`, `refreshAccessToken(refreshToken)`
  - `ensureFreshToken(account)` — refresh-if-near-expiry + persist
  - asset upload: `uploadImage(account, bytes)`, `uploadVideo(account, bytes)` (chunked + poll)
  - org discovery: `listAdminOrgs(accessToken)`
  - `linkedinConnector: SocialConnector`
- `src/server/connectors/linkedin.config.ts` — `LINKEDIN_VERSION`, scope lists, endpoint constants.

**Modified**
- `src/server/env.ts` — add `LINKEDIN = { clientId, clientSecret }` + `assertLinkedInConfigured()`.
- `src/server/connectors/types.ts` — add optional `assertConfigured?(): void` to `SocialConnector`.
- `src/server/connectors/registry.ts` — register `linkedin`.
- `src/server/connectors/facebook.ts`, `instagram.ts` — add `assertConfigured = assertMetaConfigured`
  (so the per-connector check is uniform).
- `app/api/connect/[platform]/route.ts` — replace `assertMetaConfigured()` with
  `getConnector(platform).assertConfigured?.()`.
- `app/api/connect/[platform]/callback/route.ts` — add a LinkedIn-aware empty reason (`no_orgs`).
- `src/modules/EpccDemo/_services/publish.ts` — add `'linkedin'` to `SUPPORTED`; map `PublishInput`.
- `src/modules/EpccDemo/screens/Accounts.tsx` — LinkedIn connect/disconnect + follower/token health.
- `app/api/overview/route.ts`, `app/api/report/route.ts`, `app/api/metrics/route.ts` — branch by
  `account.platform`: Meta → Graph (unchanged); LinkedIn → connector metrics/org-stats; merge into
  the existing per-platform structures.

### Two shared-infra changes (justified)

1. **Per-connector config check.** The connect route hardcodes `assertMetaConfigured()`
   (`app/api/connect/[platform]/route.ts:12`), which would wrongly fail for LinkedIn. Add optional
   `assertConfigured?()` to the interface; each connector validates its own env; the route calls
   the connector's check. Meta connectors delegate to `assertMetaConfigured`.
2. **Token refresh, connector-internal.** FB Page tokens are effectively permanent; LinkedIn
   access tokens last ~60 days with a ~365-day refresh token. Rather than change the shared
   interface, the LinkedIn connector owns refresh: the refresh token lives in
   `ConnectedAccount.meta.refreshToken` (+ `refreshTokenExpiresAt`), and `ensureFreshToken(account)`
   refreshes + `upsertAccounts` before any API call. No other connector is affected.

---

## 3. OAuth & org discovery

### Authorization
`getAuthUrl(state)` → `https://www.linkedin.com/oauth/v2/authorization` with:
- `response_type=code`, `client_id=LINKEDIN.clientId`, `redirect_uri=redirectUri('linkedin')`,
  `state`, and `scope` = space-joined:
  `w_organization_social r_organization_social rw_organization_admin openid profile`.
- The app must have **refresh tokens enabled** so the token response includes `refresh_token`.

The generic `GET /api/connect/linkedin` route sets the `oauth_state_linkedin` cookie and redirects
here (unchanged except the config-check swap). The redirect URI
`{APP_BASE_URL}/api/connect/linkedin/callback` must be registered in the LinkedIn app.

### Token exchange
`exchangeCode(code)`:
1. POST `https://www.linkedin.com/oauth/v2/accessToken` (form-encoded:
   `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`) →
   `{ access_token, expires_in, refresh_token, refresh_token_expires_in }`.
2. `listAdminOrgs(access_token)`:
   - GET `/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED` → org URNs.
   - For each org id, GET `/rest/organizations/{id}` → `localizedName`, `vanityName`.
3. Return one `ConnectedAccount` per org:
   ```ts
   {
     platform: 'linkedin',
     accountId: `urn:li:organization:${id}`,
     name: localizedName,
     accessToken,
     tokenExpiresAt: now + expires_in,
     followers: undefined,        // filled by read-back
     meta: { refreshToken, refreshTokenExpiresAt: now + refresh_token_expires_in, vanityName },
   }
   ```
4. If no admined orgs → return `[]`; the callback redirects with `error=no_orgs&platform=linkedin`
   (mirrors the existing `no_pages` / `no_ig_account` handling at callback route lines 31-33; add
   a `linkedin → 'no_orgs'` branch).

### Token refresh
`ensureFreshToken(account)`, called at the top of `publish`, `deletePost`, `getMetrics`, and the
org-stats helper:
- If `tokenExpiresAt` is more than a 5-day buffer away → return `account` unchanged.
- Else POST the refresh grant (`grant_type=refresh_token`, `refresh_token=meta.refreshToken`,
  client id/secret) → new `{access_token, expires_in}`; build an updated account, `upsertAccounts`
  it, and return it.
- If `meta.refreshTokenExpiresAt` is in the past (refresh token itself expired) → throw
  `Error('LinkedIn authorization expired — reconnect the Page in Accounts.')`. The Accounts screen
  surfaces this as a "reconnect" state.

---

## 4. Publishing (all formats) & delete

All posts via `POST /rest/posts` with a body of:
```jsonc
{
  "author": "<account.accountId>",      // urn:li:organization:{id}
  "commentary": "<message>",
  "visibility": "PUBLIC",
  "lifecycleState": "PUBLISHED",
  "distribution": { "feedDistribution": "MAIN_FEED" },
  "content": { /* per-format, see below */ }
}
```
`publish(account, input)`:
1. `account = await ensureFreshToken(account)`.
2. Resolve media bytes: prefer `input.imageBlob`/`input.videoBlob`; else fetch `input.imageUrl`/
   `input.videoUrl` server-side into bytes.
3. Build `content` by format:
   - **Text / no media**: omit `content` (commentary-only post).
   - **Link/article** (`input.link`): `content.article = { source: input.link, title?, description? }`.
   - **Single image**: `uploadImage` → `imageURN`; `content.media = { id: imageURN, altText? }`.
   - **Multi-image** (multiple media): upload each → `content.multiImage = { images: [{ id }, …] }`.
   - **Video**: `uploadVideo` (initialize → upload part(s) → finalize → poll `GET /rest/videos/{urn}`
     until `status === 'AVAILABLE'`, with a bounded timeout like the IG container poll) →
     `content.media = { id: videoURN }`.
4. POST the post; the created URN is returned in the `x-restli-id` response header (or body id).
5. Return `{ remoteId: postURN, url: \`https://www.linkedin.com/feed/update/${postURN}\`, raw }`.

**Format mapping:** `PublishInput.format` values `reel`/`story` have no LinkedIn equivalent and are
treated as a normal feed post (no silent drop). `scheduledPublishTime` is **not** natively
supported by the Posts API → v1 ignores it for LinkedIn (the app's own scheduler can drive it
later, same as the IG-scheduler note); document this limitation.

### Image upload
`POST /rest/images?action=initializeUpload` with `{ initializeUploadRequest: { owner: orgURN } }`
→ `{ value: { uploadUrl, image } }`; PUT the bytes to `uploadUrl`; use the returned `image` URN.

### Video upload
`POST /rest/videos?action=initializeUpload` with owner + file size → upload instructions (one or
more part URLs); PUT each part, collect ETags; `POST /rest/videos?action=finalizeUpload` with the
ETags; poll `GET /rest/videos/{urn}` until `AVAILABLE`.

### Delete
`deletePost(account, remoteId)`:
1. `account = await ensureFreshToken(account)`.
2. `DELETE /rest/posts/{URL-encoded postURN}`. LinkedIn permits org-post deletion (unlike IG, which
   throws by design).

---

## 5. Read-back (metrics) & org stats

`getMetrics(account, remoteId)` — per-post, returns a flat `Record<string, number>` shaped like the
analytics layer expects:
- `GET /rest/socialActions/{postURN}` → `likesSummary.totalLikes` → `likes`;
  `commentsSummary.totalComments` → `comments`.
- `GET /rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity={orgURN}&shares={postURN}`
  → `impressionCount` → `impressions`, `clickCount` → `clicks`, `shareCount` → `shares`,
  `engagement` → `engagement` (when present).
- Any field LinkedIn does not return is omitted (not zero-filled) so the UI empty-states honestly.

`getOrgStats(account)` — org-level:
- Follower count: `GET /rest/networkSizes/{orgURN}?edgeType=COMPANY_FOLLOWED_BY_MEMBER` →
  `firstDegreeSize`. Persisted onto `account.followers`.
- Follower statistics (for Audience/Growth, when data exists):
  `GET /rest/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity={orgURN}`.

### Surfacing in the UI
- **Accounts** (`Accounts.tsx`): LinkedIn connect/disconnect, follower count, and token-health
  ("reconnect needed" when `ensureFreshToken` reports the refresh token expired).
- **Composer / Posts**: `publish.ts` adds `'linkedin'` to `SUPPORTED` and maps the post's
  media/link to `PublishInput`; the Composer already targets multiple platforms.
- **Reports / Analytics / Command Center**: `/api/overview`, `/api/report`, `/api/metrics` iterate
  connected accounts and **branch by `account.platform`** — Meta accounts call Graph (unchanged);
  LinkedIn accounts call `linkedinConnector.getMetrics` / `getOrgStats`. Results merge into the same
  per-platform arrays the screens already render. Where LinkedIn lacks a metric (or before product
  approval), the screen shows its existing empty state.

---

## 6. Phasing (the plan will sequence these)

The spec covers everything; the implementation plan delivers it in independently-shippable phases.

- **Phase A — Foundation + Connect:** `env.ts` LINKEDIN config, `assertConfigured` interface +
  per-connector adoption, connect-route config swap, registry registration, `linkedin.ts` OAuth +
  `listAdminOrgs` + `ensureFreshToken`, callback `no_orgs` branch, Accounts connect UI.
  *Deliverable: connect a real Chamber LinkedIn Page against a dev app; token persists + refreshes.*
- **Phase B — Publish + Delete:** all formats (text/link/image/multi-image/video) + delete +
  `publish.ts` wiring + Composer success/permalink.
  *Deliverable: a real post on the Chamber Page, published from the app; deletable.*
- **Phase C — Read-back:** `getMetrics`, `getOrgStats`, and the overview/report/metrics merge.
  *Deliverable: LinkedIn engagement + follower numbers in Reports/Analytics/Command Center.*

---

## 7. Testing & verification

- `npm run typecheck` + a clean `npm run build` (`rm -rf .next` first — known stale-cache false
  error) gate every task. No unit-test framework is added (YAGNI; matches the project).
- Manual verification per phase against a **LinkedIn dev app** + the Chamber org the tester
  administers (LinkedIn allows posting to an org you admin during development, mirroring Meta dev
  mode):
  - Phase A: "Connect LinkedIn" → OAuth → org appears in Accounts with a follower count; force a
    near-expiry token and confirm `ensureFreshToken` refreshes + persists.
  - Phase B: publish each format → the post appears on the Page; delete removes it.
  - Phase C: published-post metrics + org followers appear in Reports/Analytics; empty states where
    LinkedIn returns nothing.

---

## 8. Risks, limits & client expectations

- **Community Management API product approval** is required for org publishing + read-back at scale
  — a LinkedIn review (the LinkedIn analogue of Meta App Review). Build proceeds on the dev app;
  go-live waits on approval. **State this to the client.**
- **Token expiry**: unlike Meta Page tokens, LinkedIn requires refresh — handled by
  `ensureFreshToken`; if the refresh token lapses the user must reconnect (surfaced in Accounts).
- **No native scheduling** on the Posts API → `scheduledPublishTime` is ignored for LinkedIn in v1
  (the app's own scheduler can drive it later, same as the IG-scheduler note).
- **No Stories/Reels** on LinkedIn → those formats render as normal feed posts.
- **Follower demographics** may require a minimum follower count before LinkedIn returns
  breakdowns — empty-state when absent.
- **API versioning**: the `LinkedIn-Version` header pins a monthly version; bump
  `LINKEDIN_VERSION` when LinkedIn deprecates it (same maintenance posture as `META_GRAPH_VERSION`).

---

## 9. Out of scope (later specs)

Snapchat, TikTok, and X connectors — each its own spec → plan, reusing this same connector +
config + token-refresh pattern.
