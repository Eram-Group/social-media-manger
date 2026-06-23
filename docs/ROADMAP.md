# EPCC Demo Plan — Client-Side Only

> Goal: a **runnable, clickable demo** of a *unified social-media management platform for the Eastern Province Chamber of Commerce (EPCC)* — **front-end only, no backend**. Built on the existing `client/` app, fed by mock data, reframed for the Chamber's use case so stakeholders can see the UI and flow.

## ✅ Status: BUILT (Option B — dedicated module, all mock data)

The demo is implemented and runnable now.

- **Module:** `client/src/modules/EpccDemo/` (self-contained; mock fixtures in `_data/`, primitives in `_components/ui.tsx`, screens in `screens/`, layout `EpccDemoLayout.tsx`, routes `routes.ts`).
- **Route:** **`/epcc-demo`** — public, no login, no backend (added as a top-level route in `client/src/app/router/index.tsx`).
- **Run it:**
  ```bash
  cd client && npm install && npm run dev      # then open http://localhost:4000/epcc-demo
  ```
- **Screens built:** Command Center, Accounts, Composer, Calendar, Audience Insights, Reports, Paid Promotion, AI Assistant — all reachable from the left sidebar; styled with the real design tokens (`bg-primary-800`, `font-Sora`, `shadow-7`…) and charts via `recharts`. Interactive bits (composer scheduling/delete, promotion launch, AI generate, report export) use local state — no API calls.
- All data is **mock** (no MSW even needed for these screens; fixtures are imported directly), so it works fully offline.

To extend it, follow the `create-page` / `create-component` skills and add to `EpccDemoLayout`'s `NAV` + `routes.ts`.

### Enhancements (v2)
- **Real platform icons** — `react-icons` brand icons (X, Instagram, LinkedIn, Facebook, Snapchat, TikTok) via `PlatformChip`; Instagram uses its gradient. Defined in `_data/platforms.ts`.
- **Accounts** — modelled on the real `manage-my-accounts/sm-connections` page: aggregate metrics, per-account metrics (followers/engagement/reach/growth), **sync** (animated), **disconnect**, **connect**, and an **Add a connector** modal. State is interactive (`screens/Accounts.tsx`).
- **AI Content Studio (Composer)** — generate post copy with **OpenAI**, **upload** an image (react-dropzone) or **generate** one with **DALL·E**, and faithful **per-platform live previews** (`_components/PostPreview.tsx`) styled like real X/Instagram/LinkedIn/Facebook/Snapchat/TikTok posts.
- **Calendar** — posts + campaigns + reminders, color-coded, with a **detail drawer** (performance, platforms, edit/delete).
- **Audience** — **platform filter** (All + each platform) recomputing demographics/sentiment, plus an AI insight strip.
- **Reports** — row click opens a **detail drawer** (per-platform breakdown chart + table, top posts, AI insight, export).
- **AI everywhere** — `_components/AiInsightStrip.tsx` (live OpenAI insight + fallback) is embedded on Command Center, Audience, Reports and Promotion; the AI Assistant page generates ideas live.

### Enhancements (v3)
- **Image generation fixed** — this OpenAI org's key exposes **`gpt-image-1`**, not `dall-e-3` (the previous cause of "image not working"). The service now uses `gpt-image-1` and decodes its **base64** response into a data URL. The key is mirrored into **`.env`** so AI works under plain `npm run dev` (not only `dev:mock`). Verified: key valid, model available, OpenAI sends `access-control-allow-origin: *` (browser calls work), and live `gpt-4o-mini` text generation returns. Errors now surface in the UI instead of silently falling back.
- **Real brand-color charts** — charts use each platform's brand color (`platformColorByName` / `platformChartColor`) on Command Center and Reports.
- **Composer live preview = swipeable carousel** — `_components/PreviewCarousel.tsx` (embla-carousel; swiper isn't installed) with platform tabs, arrows and dots, one faithful `PostPreview` per slide.
- **Design-system form inputs** — `_components/form.tsx` (`DsField`, `DsTextarea`, `DsSelect`) wrap the shadcn `Input`/`Textarea`/`Select`; used in Composer and Promotion.
- **Professional animations everywhere** — `_components/motion.tsx` (framer-motion): route-level enter/exit on every screen (in `EpccDemoLayout`), animated modals (Accounts) and drawers (Calendar, Reports), and staggered account cards.

### Enhancements (v4)
- **AI image loading** — a proper generative loading state (`_components/ImageGenLoader.tsx`): shimmer sweep, pulsing wand, floating sparkles, cycling status text and a progress bar, shown while `gpt-image-1` renders.
- **Audience — richer + platform-colour-matched** — every chart now recolours to the selected platform's brand colour, with a coloured platform banner and many more per-platform insights: best time to post, top format, avg watch time, follower growth, **active-hours** chart, **content-format performance**, **new vs returning**, **device split**, **Arabic/English language split**, **top hashtags**, and a distinct narrative insight per platform.
- **New: Posts & Analytics page** (`/epcc-demo/posts`) — every post across platforms in one list; click any post for a full analytics drawer (reach, impressions, likes, comments, shares, saves, clicks, engagement rate, and a per-platform reach breakdown chart + table). Scheduled/draft posts show "no analytics yet".
- **New: Support page** (`/epcc-demo/support`) — a 24/7 support **chat** mocking how support works: dedicated agent card, hotline, quick topics, animated typing indicator, and live AI agent replies via OpenAI (`supportReply`, canned fallback).

### Enhancements (v5)
- **Fixed header + scroll** — the demo layout is now a fixed viewport (`h-screen`); only the content area scrolls, so the top header stays put.
- **Command Center** — added a **"This week" calendar strip** and a reusable **post-details sheet** (`_components/PostSheet.tsx`); week chips and recently-published rows open full post analytics.
- **Composer** — fixed the "Generate image" button overflow (full-width, icon hidden while loading); added a **hashtag/tags** input, **SEO title + image alt-text** fields, and **per-platform editing** (toggle to write a tailored variant per platform; previews + tags update live). The **Live preview** column is sticky.
- **Posts & Analytics** — added **design-system filters** (status pills with counts + platform filter) and clearer draft/scheduled row states.
- **Support** — richer typing/loading state (animated agent avatar + dots + "typing…").

### Enhancements (v6)
- **Posts + Composer merged into one "Posts" tab with full CRUD** — create / edit / delete, backed by a shared `posts-store` (context) so the **Calendar and Command Center reflect changes live**. Published posts are **delete-only**; drafts/scheduled can be edited; new posts can be saved as draft, scheduled, or published (mock analytics applied on publish).
- **3 view modes** — list / table / grid toggle on the Posts page, with status (+counts) and platform filters.
- **Promote action** wires posts → **Paid Promotion** (`/promotion?post=<id>`); the Promotion screen reads the shared store and preselects the post — everything is connected.
- **Short sheet + full analytics page** — the peek sheet shows quick details + "Open full analytics →" to a dedicated **Post Detail page** (`/epcc-demo/posts/:id`): reach-over-time, engagement mix, per-platform breakdown, top comments, with Promote/Delete.
- **AI in Tags & SEO** — one click generates hashtags + SEO title + alt text; **per-network character counters** (X 280, IG 2200…) added to the composer.
- **Competitive UX research** captured in [`ux-recommendations.md`](./ux-recommendations.md) (Hootsuite/Buffer/Sprout/etc.) — implemented items ticked, next quick wins listed.

### OpenAI key
The AI Content Studio + insight strips read **`VITE_OPENAI_API_KEY`** (in `.env` / `.env.mock`). With a key: live text (`gpt-4o-mini`) and images (`dall-e-3`). Without one: every AI feature falls back to canned EPCC content/images, so the demo always works. Service: `_services/openai.ts`. The Composer/AI pages show a "● OpenAI connected" vs "○ Sample mode" badge.

---


## 1. Running the app with NO backend

The client already supports a fully mocked mode via **MSW** (Mock Service Worker). The worker (`public/mockServiceWorker.js`), handlers (`src/mocks/handlers.ts`) and data (`src/mocks/_data/`) already exist.

```bash
cd client
npm install          # already installed
npm run dev-msw      # starts Vite + MSW-mocked API → http://localhost:4000
# (plain `npm run dev` also works but expects a real API)
```
If the worker ever goes missing: `npm run msw-init`.

**How the demo stays client-side:** every screen reads from MSW-mocked responses or local fixture data instead of the live NestJS API. No `server/`, MongoDB, Redis, OAuth, Stripe or Firebase needed. Auth is stubbed (a mock signin returns a fake token so guards pass).

## 2. Demo persona & framing
- **Org:** "Eastern Province Chamber of Commerce" (single team workspace).
- **User:** Social Media Manager (full access).
- **Connected accounts:** X, Instagram, LinkedIn, Facebook, Snapchat, TikTok (mocked health + metrics).
- Terminology reframed from influencer-marketing → Chamber comms: *Campaigns → Initiatives/Campaigns*, *Services/Gigs → Content/Posts*, *Audience → Chamber audience & members*.

## 3. Demo flow (the click-through story)
1. **Login** → mock signin → lands on the Command Center.
2. **Command Center (Dashboard)** — unified KPIs across all 6 platforms: total followers, reach, engagement, scheduled posts, top platform; trend charts (recharts). *(reuses `modules/Dashboard`.)*
3. **Accounts** — all connected platforms as cards (X, IG, LinkedIn, FB, Snapchat, TikTok) with status, followers, last-sync. *(reuses `Organization/SMConnections` patterns.)*
4. **Composer / Schedule** — write one post, pick target platforms, set `publish_at`, preview per platform, save to calendar; show **delete** action. *(reuses `ManageYourGigs` / post module.)*
5. **Content Calendar** — week/month view of scheduled & published posts; click to edit/delete.
6. **Audience Insights** — demographics (gender/age/country), interests, sentiment toward the Chamber. *(reuses connector metric shapes + recharts.)*
7. **Reports** — weekly/monthly report with export button (mock PDF/email).
8. **Paid Promotion** — boost a post: budget, platforms, audience; mock checkout.
9. **AI Assistant** — "analyze this month + suggest 5 post ideas" → returns canned suggestions (mocked).
10. **Support / 24-7 contact** — dedicated contact card + incident status.

## 4. Build approach (recommended)
Reuse the existing design system and shared components (`@UI/index`) and the routing/page patterns (see the `create-page` / `create-component` skills). Two options:

- **Option A — Reframe in place (fastest):** point existing modules (Dashboard, SMConnections, ManageYourGigs) at EPCC mock data via MSW handlers; relabel; add an "Accounts", "Calendar", "Reports", "AI" screen. Lowest effort, reuses the most.
- **Option B — Dedicated demo module (cleanest for a pitch):** new `src/modules/EpccDemo/` with purpose-built screens (Command Center, Accounts, Composer, Calendar, Insights, Reports, Promotion, AI, Support) under a `/app/epcc/*` route group, all on local fixtures. Isolated from the real product code; easy to throw away or evolve.

> Recommendation: **Option B** for a stakeholder demo — self-contained, won't disturb the live app, and showcases the EPCC flow end-to-end. Each screen still uses the real shared components + theme, so it looks production-grade.

## 5. Mock data needed (fixtures)
- 6 platform accounts (name, handle, followers, engagement %, status, avatar).
- ~12 scheduled/published posts (text, platforms[], media, publish_at, status).
- Aggregate KPIs + 30-day trend series per platform.
- Audience: gender/age/country splits, interests, sentiment score.
- AI suggestions list (5 canned ideas).
Place under `src/modules/EpccDemo/_data/` (Option B) or `src/mocks/_data/` (Option A).

## 6. Branding for EPCC
Palette is token-driven (`tailwind.config.js`) — swap `primary-*` to Chamber colors and the logo asset; all components follow automatically (see `documentation/client/design-system.md`). Add Arabic/RTL later (Phase 1 in the roadmap).

## 7. Out of scope for the client-only demo
Real social OAuth, real scheduling worker, real payments/ads, real AI, real reports/email. These are backend phases in `documentation/INDEX.md` §4. The demo *shows* these flows with mocked responses.
