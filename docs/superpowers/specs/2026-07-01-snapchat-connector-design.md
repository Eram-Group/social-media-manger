# Snapchat Public-Profile Connector — Design Spec

**Date:** 2026-07-01
**Status:** Approved (design) — pending implementation plan
**Scope:** Phase 2b of the connector roadmap. Stacks on `feat/linkedin-connector`
(reuses the shared `assertConfigured?()` interface hook + the published-posts ledger).

---

## 1. Problem & goals

EPCC's platform has real connectors for Facebook, Instagram, and (pending approval) LinkedIn.
This adds a **Snapchat connector** so the Chamber can post organic content to its **Snapchat
Public Profile** and read engagement back — using the same `SocialConnector` registry pattern.

Snapchat's organic-posting surface is the **Public Profile API** (part of Snap's Marketing API).
It supports posting **Stories** (ephemeral, 24h), **Saved Stories** (permanent on the profile),
and **Spotlight** (permanent discovery videos), plus content + profile analytics.

**Goals**
- Connect the Chamber's **Snapchat Public Profile** via OAuth 2.0; persist tokens server-side.
- **Publish** Stories, Saved Stories, and Spotlight content (image + video).
- **Delete** posted content.
- **Read-back**: content metrics (views/screenshots, Spotlight views) + profile/audience stats,
  surfaced in Accounts, Reports, Analytics, Command Center.
- Keep the shared `SocialConnector` interface unchanged (reuse `assertConfigured?()` + the
  connector-owned token-refresh pattern from LinkedIn).
- Reuse the **published-posts ledger** so Snapchat posts stay in the Posts list (Stories vanish
  from the API after 24h; the ledger keeps a record).

**Non-goals**
- No **Lenses** (AR) — out of scope.
- No paid ads (Snap Marketing ads API) — organic Public-Profile posting only.
- No changes to the Meta/LinkedIn connectors' behavior.

**Target API:** Snapchat **Public Profile API** under the Marketing API
(`https://adsapi.snapchat.com`), OAuth 2.0 via `https://accounts.snapchat.com`.

---

## 2. Architecture

A new `SocialConnector` implementation; the rest of the app dispatches through the registry.

### Files
**New**
- `src/server/connectors/snapchat.config.ts` — `SNAP_API` base, `SNAP_OAUTH` base, `SNAPCHAT_SCOPES`,
  API version constants, content-type enums.
- `src/server/connectors/snapchat.ts` — API helpers (request wrappers, OAuth exchange + refresh,
  `ensureFreshToken`, profile discovery, media upload, content create/delete, metrics) + the
  `snapchatConnector: SocialConnector`.

**Modified**
- `src/server/env.ts` — `SNAPCHAT = { clientId, clientSecret }` + `assertSnapchatConfigured()`.
- `src/server/connectors/registry.ts` — register `snapchat`.
- `src/modules/EpccDemo/_services/publish.ts` — `SUPPORTED += 'snapchat'`; map media/format.
- `app/api/posts/publish/route.ts` — persist Snapchat posts to the ledger on success (like LinkedIn).
- `app/api/posts/list/route.ts` — the ledger merge already includes any non-readback platform;
  ensure Snapchat rows render (reuse existing merge).
- `src/modules/EpccDemo/screens/Accounts.tsx` — add `snapchat` to `CONNECTABLE`.
- `app/api/overview/route.ts`, `app/api/metrics/route.ts`, `app/api/report/route.ts` — add a
  `snapchat` branch (profile stats / content metrics), like the LinkedIn branch.

### Reused shared infra (already on the base branch)
- `SocialConnector.assertConfigured?()` — Snapchat sets `assertConfigured: assertSnapchatConfigured`.
- Connector-owned token refresh (`ensureFreshToken`) — Snap tokens expire (~1–2h access token),
  refresh token stored in `ConnectedAccount.meta`.
- `savePublishedPost` / `listPublishedPosts` — persist + list Snapchat posts.

---

## 3. OAuth & profile discovery

### Authorization
`getAuthUrl(state)` → `https://accounts.snapchat.com/login/oauth2/authorize` with
`response_type=code`, `client_id`, `redirect_uri=redirectUri('snapchat')`, `state`, and
`scope = SNAPCHAT_SCOPES` (the Public Profile / Marketing API scopes, e.g.
`snapchat-marketing-api` plus the profile content scopes the app is granted).

The generic connect route (`GET /api/connect/snapchat`) already handles CSRF state + cookie and
calls `connector.assertConfigured?.()` (from the LinkedIn refactor). The redirect URI
`{APP_BASE_URL}/api/connect/snapchat/callback` must be registered in the Snap app.

### Token exchange + refresh
`exchangeCode(code)`:
1. POST `https://accounts.snapchat.com/login/oauth2/access_token` (form-encoded:
   `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`) →
   `{ access_token, expires_in, refresh_token }`.
2. Discover the **Public Profile(s)** the authenticated user manages (via the organization →
   public profile lookup in the Public Profile API). Build one `ConnectedAccount` per profile:
   `accountId` = public profile id, `name` = profile display name,
   `meta = { refreshToken, organizationId }`, `tokenExpiresAt = now + expires_in`.
3. No profiles → callback redirects with `error=no_profiles&platform=snapchat`.

`ensureFreshToken(account)` (called before every publish/read/delete): Snap access tokens are
short-lived, so refresh when within a buffer of expiry via `grant_type=refresh_token`, then
`upsertAccounts` the new token. Refresh failure → throw
`Error('Snapchat authorization expired — reconnect in Accounts.')`.

> VERIFY during implementation (against Snap docs / the dev app): the exact profile-discovery
> endpoint path and the token/expiry field names. Marked in code.

---

## 4. Publishing (Stories, Saved Stories, Spotlight) & delete

Snapchat posting is a **multi-step media flow** (like IG containers / LinkedIn assets):
1. **Create/register media** and **upload the bytes** (Snap uses chunked upload for larger media;
   images and short videos may be single-part). Poll processing status if async.
2. **Create the content** referencing the uploaded media, with the target type:
   - **Story** (ephemeral 24h),
   - **Saved Story** (permanent on the profile),
   - **Spotlight** (permanent video in the discovery feed).

`publish(account, input)`:
1. `account = await ensureFreshToken(account)`.
2. Resolve bytes: `input.videoBlob`/`input.imageBlob`, else fetch `input.videoUrl`/`input.imageUrl`.
3. Upload media → media id.
4. Choose content type from `input.format`:
   - `story` → Story; `video`/`reel` → Spotlight (video) or a video Story; default (`post`) →
     Story **and** Saved Story (so it persists on the profile).
   - (A small, explicit mapping table in code; `reel`/`story` have natural Snap equivalents.)
5. Create the content → returns a content id.
6. Return `{ remoteId: contentId, url?: profile/spotlight permalink when derivable, raw }`.
7. `scheduledPublishTime` is ignored for Snapchat in v1 (no native scheduling) — documented.

`deletePost(account, remoteId)` → `ensureFreshToken` then delete the content by id.

> VERIFY during implementation: exact media-upload endpoints (register/upload/finalize), the
> content-creation endpoint + payload per type, and the delete endpoint. Marked `VERIFY` in code.

**Ledger:** on a successful Snapchat publish, `savePublishedPost({ platform:'snapchat', ... })` so
the post stays in the Posts list (Stories disappear from the API after 24h). Reuses the existing
`/api/posts/publish` persistence + `/api/posts/list` merge (URL-safe id already handled).

---

## 5. Read-back (metrics) & profile stats

`getMetrics(account, remoteId)` → `Record<string, number>`:
- Content metrics: **views**, **screenshots**, **swipe-ups/link clicks**, **shares**,
  **Spotlight views** (whichever the API returns for that content type). Absent metrics omitted.

`getProfileStats(account)` → `{ followers?: number }` (+ audience insights where available):
- Public Profile subscriber count + reach/insights. Persisted onto `account.followers`.

**Surfacing:** `/api/overview`, `/api/metrics`, `/api/report` add a `snapchat` branch
(platform-gated, additive — Meta/LinkedIn paths unchanged) contributing profile followers and, per
route, content metrics. Absent Snap-specific fields left empty (UI empty-states). Accounts shows
the connected profile + follower count + token health.

> VERIFY during implementation: the analytics/insights endpoints + metric field names.

---

## 6. Phasing (the plan sequences these)

- **Phase A — Foundation + Connect:** `snapchat.config.ts` + env + `assertSnapchatConfigured`,
  registry registration, `snapchat.ts` OAuth + profile discovery + `ensureFreshToken`, callback
  `no_profiles` branch, Accounts `CONNECTABLE`. *Deliverable: connect a real Public Profile (dev).*
- **Phase B — Publish + Delete:** media upload + content create (Story/Saved Story/Spotlight) +
  delete + `publish.ts`/publish-route wiring + ledger persistence.
  *Deliverable: a real Snap on the Public Profile from the app; stays in the list.*
- **Phase C — Read-back:** `getMetrics` + `getProfileStats` + analytics-route surfacing.
  *Deliverable: Snapchat followers + content metrics in the dashboards.*

---

## 7. Testing & verification

- `npm run typecheck` + a clean `npm run build` (`rm -rf .next` first) gate every task. No
  unit-test framework (matches the project). **Build-green mode** — Snap API request/response
  field names are implemented per Snap docs and **verified live later** by the user against a Snap
  **dev app + Public Profile** (marked `VERIFY` in code); tasks that can't run live still pass
  typecheck/build.
- Manual (when a Snap Business app + Public Profile + Marketing-API access exist): connect →
  publish each type → delete → metrics.

---

## 8. Risks, limits & client expectations

- **Snap Marketing-API / Public-Profile access approval** is required (Snap Business account +
  Public Profile + app access) — the platform gate, analogous to Meta App Review / LinkedIn CM API.
  Build proceeds; go-live waits on Snap approval. **State this to the client.**
- **Short-lived access tokens** → handled by `ensureFreshToken` (refresh token required).
- **Stories are ephemeral (24h)** → the published-posts ledger keeps them visible in the app;
  their live metrics may stop resolving after they expire.
- **No native scheduling** → `scheduledPublishTime` ignored in v1.
- **Exact Snap API endpoints/fields** must be verified live (marked `VERIFY`) — same posture as
  LinkedIn's build-green connector.

---

## 9. Out of scope (later specs)

TikTok and X connectors — each its own spec → plan, reusing this same connector + config +
token-refresh + ledger pattern.
