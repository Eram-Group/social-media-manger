# EPCC Social Connectors — Master Plan (All Platforms)

_Updated 2026-07-02 · branch `feat/tiktok-connector`. The single authoritative plan for every connector: architecture, per-platform build + go-live, and roadmap. Per-connector specs/plans live under `docs/superpowers/`._

---

## 1. Shared architecture (every connector follows this)

One interface, many implementations — `src/server/connectors/`:

```ts
interface SocialConnector {
  id: TPlatformId;
  assertConfigured?(): void;                 // validate env; throws if missing
  getAuthUrl(state, codeChallenge?): string; // start OAuth (codeChallenge for PKCE, X only)
  exchangeCode(code, codeVerifier?): Promise<ConnectedAccount[]>;
  publish(account, input): Promise<PublishResult>;
  getMetrics?(account, remoteId): Promise<Record<string, number>>;
  deletePost?(account, remoteId): Promise<void>;
}
```

Shared pieces reused by all:
- **Generic connect routes** — `app/api/connect/[platform]/route.ts` (start OAuth + CSRF `state` cookie, calls `assertConfigured`) and `.../callback/route.ts` (verify state → `exchangeCode` → `upsertAccounts`).
- **Registry** — `registry.ts` maps `platform → connector`; `isSupported()` gates routes.
- **Token vault** — `store.ts` (Neon `connected_accounts` + `.data/` fallback); `toPublic()` strips access + refresh tokens before returning to the browser.
- **Connector-owned token refresh** — `ensureFreshToken(account)`; refresh token in `ConnectedAccount.meta`.
- **Published-posts ledger** — `published_posts` table; keeps posts we can't read back (LinkedIn member, Snapchat Stories, X) in `/api/posts/list`.
- **Publisher** — `_services/publish.ts` (`SUPPORTED` list) + `app/api/posts/publish/route.ts`.
- **Analytics surfacing** — per-platform branches in `/api/overview`, `/api/metrics`, `/api/report`.
- **Accounts UI** — generic `CONNECTABLE` list renders connect/disconnect for every platform.

**Conventions:** build-green (typecheck + clean `npm run build` after `rm -rf .next`); external-API field names marked `// VERIFY` and confirmed live later; never zero-fill absent metrics; secrets in `.env.local` only.

**To add any platform:** `x.config.ts` + `x.ts` (OAuth + publish + read-back) → register → add to `SUPPORTED` + `CONNECTABLE` → analytics branch. ~8 tasks, same shape each time.

---

## 2. Facebook — 🟢 live (reference implementation)
- **API:** Meta Graph `v22.0`. **OAuth:** Meta Login; Page token derived from a long-lived user token (effectively permanent → no refresh needed).
- **Publish:** feed text/photo/video/reel/story; native scheduling. **Delete:** yes. **Read-back:** post insights, page engagement/followers (demographics removed by Meta).
- **Status:** done, live. **Go-live gate:** cleared (App Review done for the Chamber).

## 3. Instagram — 🟢 live
- **API:** Instagram Graph (via the linked FB Page). **OAuth:** shared Meta app; IG business account.
- **Publish:** two-step container→publish; image/video/reel/story. **Delete:** ⛔ no IG delete API → "remove from dashboard." **Read-back:** insights + demographics (100+ followers).
- **Status:** done, live. **Gate:** cleared. **Follow-up:** own Cron scheduler (IG has no native schedule API).

## 4. LinkedIn — 🟡 built; personal-profile live, Company Page blocked
- **Code:** `linkedin.ts` + `linkedin.config.ts` (PR #3, merged to `main`). Versioned REST **Posts API**; OAuth2 + refresh (`ensureFreshToken`).
- **Working live:** connect + **publish to personal profile** (`w_member_social`, via `LINKEDIN_IDENTITY_ONLY=true` member mode), delete, ledger.
- **Blocked:** Company-Page publish + followers/analytics + reading existing posts.
- **Plan to finish (go-live):**
  1. Create a **new** LinkedIn app with **only** the **Community Management API** product (LinkedIn's only-product rule).
  2. Associate it with the Chamber's **verified Company Page**; submit the access form with **legal org name + business email**.
  3. LinkedIn **approves** (Development Tier).
  4. Put its Client ID/Secret in `.env.local`, unset `LINKEDIN_IDENTITY_ONLY` → reconnect → org publish + analytics light up.
  5. Small code follow-up: add a `/api/posts/list` LinkedIn org branch (`GET /rest/posts?author={org}`) to list existing Page posts.
- **Hard limit:** personal-post analytics impossible (`r_member_social` closed by LinkedIn).
- **Docs:** `docs/superpowers/specs|plans/2026-06-30-linkedin-connector*`, `docs/linkedin-setup.md`.

## 5. Snapchat — 🟡 built; not live yet
- **Code:** `snapchat.ts` + `snapchat.config.ts` (PR #4, on `dev`). Public Profile API; OAuth2 + refresh.
- **Capabilities:** publish **Stories / Saved Stories / Spotlight**, delete, `getMetrics` + `getProfileStats` (subscribers), ledger.
- **Plan to finish (go-live):**
  1. **Snap Business account** (business.snapchat.com), be Organization Admin.
  2. **Public Profile** (Snapchat phone app → Settings → Public Profile).
  3. **OAuth App** in Business Manager → Business Details → OAuth Apps → Client ID/Secret; redirect `…/api/connect/snapchat/callback`.
  4. **Marketing/Public-Profile API access approval** from Snap.
  5. Client ID/Secret → `.env.local` → Connect → live-verify the `// VERIFY` endpoints (media upload/content-create/stats field names).
- **Follow-ups:** chunked upload for large video; `organizationId` fail-fast guard.
- **Docs:** `docs/superpowers/specs|plans/2026-07-01-snapchat-connector*`.

## 6. X (Twitter) — 🔨 built; not live yet
- **Code:** `x.ts` + `x.config.ts` (on `feat/tiktok-connector`). X API **v2**; OAuth 2.0 **Authorization Code + PKCE** (confidential client). Authorize `x.com/i/oauth2/authorize`; token `api.x.com/2/oauth2/token`; scopes `tweet.read tweet.write users.read offline.access` (offline.access → refresh token).
- **PKCE handling (the one shared-flow change — done):** `SocialConnector.usesPkce` flag + optional `codeChallenge` on `getAuthUrl` and `codeVerifier` on `exchangeCode`; the connect route generates a `code_verifier` + S256 challenge and cookies the verifier for PKCE connectors. Backward-compatible (other connectors ignore it).
- **Capabilities (built):** publish `POST /2/tweets` (text; chunked `media/upload` → `media_ids`; up to 4 images or 1 video), delete `DELETE /2/tweets/:id`, read-back tweet `public_metrics` (likes/retweets/replies/impressions) + follower count (`getUserStats`), ledger, analytics surfacing (overview/metrics/report/insights).
- **Go-live gate:** X API v2 is **paid** — posting needs at least the **Basic tier (~$200/mo)**; free tier is write-limited.
- **Plan to finish (go-live):** put `X_CLIENT_ID`/`X_CLIENT_SECRET` in `.env.local` (Web App / confidential client; callback `…/api/connect/x/callback`) → subscribe to a paid tier → Connect → live-verify the `// VERIFY` endpoints (api.x.com hosts, media upload command flow).
- **Follow-ups:** own Cron scheduler (X v2 has no native schedule); confirm media-upload host/field names live.

## 7. TikTok — 🔨 built; not live yet
- **Code:** `tiktok.ts` + `tiktok.config.ts` (on `feat/tiktok-connector`). TikTok **Content Posting API** + **Login Kit** (OAuth2). Authorize `www.tiktok.com/v2/auth/authorize`; token `open.tiktokapis.com/v2/oauth/token`; scopes `video.publish`, `video.upload`, `user.info.basic` (+ `photo.publish` for photo mode). Refresh token supported.
- **Capabilities (built):** creator-info query (privacy level) → Direct Post video (**PULL_FROM_URL** — pairs with our Vercel Blob upload) and photo mode → poll status until `PUBLISH_COMPLETE`; read-back per-video stats (`getMetrics`: views/likes/comments/shares) + follower count (`getUserStats`); ledger; analytics surfacing. **Delete:** none via API → hide via ledger.
- **Go-live gate:** **content-posting audit** by TikTok (~1–2 wks). Until approved, posts are forced **SELF_ONLY (private)**. Strict UX rules (show creator info) for the audit.
- **Plan to finish (go-live):** put `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` in `.env.local` (callback `…/api/connect/tiktok/callback`; domain-verify the Blob media host for PULL_FROM_URL) → submit the content-posting audit → Connect → live-verify the `// VERIFY` endpoints (Content Posting API paths, `post_info`/`source_info` fields, video-query stats shape).
- **Follow-ups:** own Cron scheduler; FILE_UPLOAD path for blob-only media (currently URL-only).

---

## 8. Roadmap / build order

| # | Platform | Effort (code) | Go-live gate | State |
|---|---|---|---|---|
| 1 | Facebook | done | — | 🟢 live |
| 2 | Instagram | done | — | 🟢 live |
| 3 | LinkedIn | done | Community Management API approval | 🟡 personal live |
| 4 | Snapchat | done | Snap Marketing-API approval | 🟡 built |
| 5 | **X** | done | paid tier ($200/mo) | 🟡 built |
| 6 | **TikTok** | done | content-posting audit (~2wk) | 🟡 built |

**All six connectors are now code-complete and build-green.** What's left is per-platform go-live: LinkedIn Community-Management-API approval, Snap Marketing-API approval, an X paid tier, and the TikTok content-posting audit — start the TikTok audit early since it has the longest lead-time.

**Cross-cutting follow-ups (any time):** encrypt tokens at rest (`store.ts` note); IG own-scheduler (Cron); normalize per-route error surfacing; LinkedIn org post-list branch.

---

## 9. Where the docs live
- This master plan: `docs/connectors-master-plan.md`
- Status matrix: `docs/connectors-status.md` · Triage: `docs/connectors-triage.md`
- LinkedIn: `docs/superpowers/specs|plans/2026-06-30-linkedin-connector*` + `docs/linkedin-setup.md`
- Snapchat: `docs/superpowers/specs|plans/2026-07-01-snapchat-connector*`
- TikTok: `docs/superpowers/specs|plans/2026-07-01-tiktok-connector*`
- X: built directly from this master plan (§6) — code in `src/server/connectors/x.ts` + `x.config.ts`.
