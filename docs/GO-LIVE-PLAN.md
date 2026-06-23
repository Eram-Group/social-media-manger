# Go-Live Plan — From Demo to Real Social Connectors

This document is the roadmap for turning the EPCC demo (mock data, client-side) into a
**real** product that connects to live social networks and publishes real posts. It
starts with **Meta / Facebook** (your first target) and explains how all six connectors
fit together.

> **The single most important fact:** the demo runs entirely in the browser. A real
> product **cannot**. Every platform uses OAuth with a **client secret** and issues
> **access tokens** that must never be exposed to a browser. So step one of going live is
> **adding a backend** — without it, no real connector is possible (and your OpenAI key is
> already leaking, same root cause).

---

## 1. What "going live" actually means

The demo today:
- `src/mock-server/` → hard-coded fixtures.
- `posts-store.tsx` → posts live in React memory, reset on reload.
- `_services/openai.ts` → calls OpenAI **from the browser** with a `VITE_` key.

The live product needs four new things:

| # | New piece | Why |
|---|-----------|-----|
| 1 | **Backend / API server** | Hold OAuth secrets + tokens, talk to each platform server-to-server, store data. |
| 2 | **Database** | Store connected accounts, tokens (encrypted), posts, schedules, analytics. |
| 3 | **OAuth "Connect account" flows** | Let a Chamber admin authorize each platform and grant your app a token. |
| 4 | **Per-platform connectors** | One module per network that turns a unified "post" into that platform's API calls. |

The React app you already have becomes the **frontend** — it stops reading mock data and
instead calls **your backend**, which calls the platforms.

---

## 2. Target architecture

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────────┐    OAuth + REST    ┌──────────────┐
│  React app  │ ──────────────────► │   Your backend API   │ ─────────────────► │  Facebook    │
│ (this repo) │ ◄────────────────── │  (Node/Next API)     │ ◄───────────────── │  Instagram   │
└─────────────┘                     │                      │                    │  LinkedIn    │
                                    │  • OAuth callbacks    │                    │  X / TikTok  │
                                    │  • token vault (enc)  │                    │  Snapchat    │
                                    │  • connector modules  │                    └──────────────┘
                                    │  • scheduler (cron)   │
                                    └──────────┬───────────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Database   │  accounts, tokens, posts, metrics
                                        └─────────────┘
```

**Recommended stack** (smallest jump from where you are, deploys on Vercel which you
already use):
- **Next.js** (move this Vite app into Next, or add a separate Next API app) — gives you
  server routes for OAuth callbacks and connector calls.
- **Postgres** (Vercel Postgres / Neon / Supabase) for storage.
- **Token encryption** at rest (e.g. `libsodium` / KMS).
- A **scheduler** for "publish at scheduled time" (Vercel Cron or a queue).

---

## 3. The unifying idea: one Connector interface for all platforms

Every platform differs, but they share a shape. Define **one interface** and implement it
per platform — this is what "makes the connectors work together." It mirrors your existing
`TPlatformId` and `IPost` types, so the frontend barely changes.

```ts
// One contract, six implementations.
interface SocialConnector {
  id: TPlatformId;                       // 'facebook' | 'instagram' | ...
  // 1. OAuth
  getAuthUrl(state: string): string;     // where to send the user to authorize
  exchangeCode(code: string): Promise<ConnectedAccount>;   // callback → tokens
  refreshToken(account: ConnectedAccount): Promise<ConnectedAccount>;
  // 2. Publishing
  publish(account: ConnectedAccount, post: IPost): Promise<{ remoteId: string }>;
  // 3. Read-back (later)
  getMetrics(account: ConnectedAccount, remoteId: string): Promise<PostMetrics>;
  getInbox?(account: ConnectedAccount): Promise<IConversation[]>;
}
```

When the user clicks "Publish" on a post targeting 3 platforms, the backend loops the 3
connectors and calls `publish()` on each. Your `posts-store` then stores the returned
`remoteId` per platform. This is the same multi-platform model the composer already has —
you're just swapping the mock store for real API calls.

---

## 4. Per-platform reality check (researched June 2026)

Difficulty / cost vary **a lot**. Do them in this order.

| Platform | API | Key permissions / scopes | Review / verification | Cost | Notes |
|----------|-----|--------------------------|------------------------|------|-------|
| **Facebook Page** ⭐ start here | Graph API `v25.0` | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` | App Review + Business Verification **only to go public**; you can post to **your own Page in Dev Mode now** | Free | Easiest first win. |
| **Instagram** | Instagram Graph API | `instagram_business_basic`, `instagram_business_content_publish` | Same Meta App Review; needs **Business/Creator** IG account linked to a FB Page | Free | Two-step "container → publish"; 100 posts/24h. Old `instagram_basic` scopes were removed Jan 2025. |
| **LinkedIn** | Community Management API | `w_organization_social` (Page), `w_member_social` (profile) | App + "Share on LinkedIn"/"Community Management" product approval | Free | ~100 posts/day/member. Some read scopes are closed. |
| **TikTok** | Content Posting API | content.posting scopes | **Separate audit**; until passed, posts are `SELF_ONLY` (private). Hard UX rules (show username/avatar). | Free | Audit ~1–2 weeks. Public posting blocked until audited. |
| **Snapchat** | Marketing API (Creative Kit) | OAuth2 (client id/secret/refresh) | Open to all devs; needs Public Profile | Free API | Geared to **ads/creatives**, not simple organic posts — heaviest mismatch with the demo. |
| **X (Twitter)** | API v2 | `tweet.write`, OAuth2 | Developer account | **Paid** — pay-per-use ~$0.015/post ($0.20 if it has a link) as of Feb 2026; no free posting tier | Cost scales with volume; budget for it. |

⭐ = recommended first connector. Sources are listed at the bottom.

---

## 5. DEEP DIVE — your first real post on Facebook

This is the concrete path to the milestone you asked for: **publish the first real post
from the app to a Facebook Page.**

### 5.1 Good news: no App Review needed for the FIRST post
While your Meta app is in **Development Mode**, it can publish to **Pages you administer**
using your own (admin/developer/tester) account. **App Review and Business Verification are
only required to let *other* people / the public connect.** So you can demo a real post end
to end before any lengthy review.

### 5.2 One-time setup (Meta side)
1. Create a **Meta Business** account and make sure the Chamber's **Facebook Page** exists
   and you're an admin of it.
2. Go to **developers.facebook.com → My Apps → Create App → type "Business."**
3. Add the **Facebook Login** and **Pages API** products.
4. In **App Settings → Basic**, note your **App ID** and **App Secret** (secret stays on
   the backend, never in the browser).
5. Add an **OAuth redirect URI** pointing at your backend, e.g.
   `https://<your-app>/api/connect/facebook/callback`.
6. Add yourself as an app **Admin/Tester** so Dev Mode posting works.

### 5.3 The token chain (this is the part people get wrong)
```
User clicks "Connect Facebook"
   ↓  Facebook Login dialog (scopes: pages_show_list, pages_read_engagement, pages_manage_posts)
short-lived USER access token  (≈1 hour)
   ↓  GET /oauth/access_token?grant_type=fb_exchange_token
long-lived USER access token   (≈60 days)
   ↓  GET /me/accounts   (lists Pages you admin)
PAGE access token   ← derived from a long-lived user token, this effectively NEVER expires
```
Store the **Page access token** (encrypted) — that's what you publish with.

### 5.4 The publish calls (Graph API v25.0)
**Text post:**
```
POST https://graph.facebook.com/v25.0/{page-id}/feed
Body: { "message": "Hello from the Chamber 🚀", "access_token": "{PAGE_TOKEN}" }
→ { "id": "{page_post_id}" }
```
**Photo post:**
```
POST https://graph.facebook.com/v25.0/{page-id}/photos
Body: { "url": "https://.../image.jpg", "caption": "…", "access_token": "{PAGE_TOKEN}" }
→ { "id": "{photo_id}", "post_id": "{page_post_id}" }
```
**Schedule instead of publish now:** add `"published": false` +
`"scheduled_publish_time": <unix ts ≥10 min and ≤75 days out>`.

Store the returned `post_id` on the post in your DB so Reports/Analytics can read it back
later via `GET /{post_id}/insights`.

### 5.5 Definition of done for milestone 1
- "Connect Facebook" button → OAuth → backend stores a Page token.
- "Publish" on a post with `facebook` selected → real post appears on the Chamber Page.
- The returned `post_id` is saved; the composer shows success (using the same UI you have).

---

## 6. Phased roadmap

| Phase | Goal | Outcome |
|-------|------|---------|
| **0. Foundation** | Add backend + DB; move OpenAI key server-side; define `SocialConnector` interface + token vault. | Secrets safe; architecture ready. |
| **1. Facebook (Dev Mode)** ⭐ | Implement FB connector: OAuth connect + publish text/photo to your own Page. | **First real post.** |
| **2. Facebook (public)** | Business Verification + App Review for `pages_manage_posts`. | Any Chamber staff can connect. |
| **3. Instagram** | Reuse Meta app; add IG container→publish flow. | IG live (big reuse from FB). |
| **4. LinkedIn** | Community Management API for the Chamber Page. | LinkedIn live. |
| **5. Read-back** | Real metrics/insights → replace mock KPIs, Reports, Post analytics. | Dashboards show real data. |
| **6. Inbox** | Comments/mentions via `pages_manage_engagement` etc. | Real unified inbox. |
| **7. X / TikTok / Snapchat** | Add as budget/need dictates (X = paid; TikTok = audit; Snapchat = ads-oriented). | Full coverage. |

---

## 7. Decisions locked (2026-06-23)

- **Backend:** migrate this Vite app into **Next.js** (App Router) — server routes host the
  OAuth callbacks + connector calls, deployed on Vercel.
- **Database:** **Vercel Postgres / Neon**.
- **Meta access:** confirmed — you are a Page admin and have a Meta Business account. ✅

### Still needed from you (when we reach the wiring step)
- **Meta App ID + App Secret** (after we create the app) → goes into backend env only.
- The **Chamber Facebook Page ID** (we can also fetch it via `/me/accounts`).

---

## 8. Concrete task breakdown — Phase 0 + 1

### Phase 0 — Foundation (the migration)
- [ ] Migrate Vite → **Next.js (App Router)**; move screens/components under it, keep the
      existing UI, Tailwind, and `@` alias. Replace `react-router` routes with Next routes.
- [ ] Provision **Neon/Vercel Postgres**; add an ORM (Prisma or Drizzle).
- [ ] Schema: `connected_accounts` (platform, page_id, token **encrypted**, expiry),
      `posts`, `post_targets` (per-platform remoteId + status), `metrics`.
- [ ] Move the **OpenAI key server-side** — add `/api/ai/*` routes, drop `VITE_OPENAI_API_KEY`
      from the client, **rotate the leaked key**.
- [ ] Add the **`SocialConnector`** interface + a token vault (encrypt at rest).

### Phase 1 — Facebook first post (Dev Mode, no review)
- [ ] Create the **Meta Business app** (Facebook Login + Pages API products), set redirect
      URI `https://<app>/api/connect/facebook/callback`, add yourself as Admin/Tester.
- [ ] Build `GET /api/connect/facebook` → redirect to FB OAuth (scopes:
      `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`).
- [ ] Build the **callback**: code → long-lived user token → `/me/accounts` → store the
      **Page access token** (encrypted) as a `connected_account`.
- [ ] Build `POST /api/posts/publish`: for each `facebook` target call
      `POST /v25.0/{page-id}/feed` (or `/photos`); save the returned `post_id`.
- [ ] Wire the existing **composer "Publish"** button to the new endpoint; show real
      success/error.
- [ ] **Milestone:** a real post appears on the Chamber Page, published from the app. 🎉

---

## Sources
- Meta — [Pages API: Posts](https://developers.facebook.com/docs/pages-api/posts/), [Pages API](https://developers.facebook.com/docs/pages-api/), [Permissions Reference](https://developers.facebook.com/docs/permissions/)
- Meta — [Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/), [IG media_publish](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/)
- LinkedIn — [Community Management Overview](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview), [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api)
- X — [API pricing](https://docs.x.com/x-api/getting-started/pricing)
- TikTok — [Content Posting API: Get Started](https://developers.tiktok.com/doc/content-posting-api-get-started), [Direct Post reference](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- Snapchat — [Marketing API](https://developers.snap.com/api/marketing-api/Ads-API/introduction), [Creatives](https://developers.snap.com/marketing-api/Ads-API/creatives)
