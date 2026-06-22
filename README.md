# EPCC — Social Media Management Platform (Demo)

A standalone, **client-side** demo of a unified social-media management platform built
for the **Eastern Province Chamber of Commerce (EPCC)**, Saudi Arabia.

It brings six networks — **X, Instagram, LinkedIn, Facebook, Snapchat, TikTok** — into a
single command center for publishing, scheduling, analytics, audience insights, paid
promotion, a shared inbox, reports, and an AI assistant.

> **Everything runs in the browser.** There is no backend and no database. All numbers,
> posts, conversations and reports are **mock/in-memory fixtures** that reset on page
> reload. The only outbound calls are optional requests to the OpenAI API for the AI
> features (see [AI integration](#ai-integration)).

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Getting started](#getting-started)
3. [Environment variables](#environment-variables)
4. [Available scripts](#available-scripts)
5. [How the app is wired](#how-the-app-is-wired)
6. [Routing & screens](#routing--screens)
7. [The mock data layer](#the-mock-data-layer)
8. [State management](#state-management)
9. [AI integration](#ai-integration)
10. [Theming & UI](#theming--ui)
11. [Project structure](#project-structure)
12. [Deployment](#deployment)
13. [Security notes](#security-notes)

---

## Tech stack

| Area | Choice |
|------|--------|
| Build tool | **Vite 5** |
| Language | **TypeScript 5** + **React 18** |
| Routing | **react-router-dom 6** (`createBrowserRouter`) |
| Styling | **Tailwind CSS 3** + `tailwindcss-animate`, custom design tokens |
| UI primitives | **shadcn/ui** components on top of **Radix UI** (select, popover) |
| Charts | **Recharts** (KPI trends, donuts, breakdowns) |
| Animation | **Framer Motion** (page transitions, widgets) |
| Icons | **lucide-react** (UI) + **react-icons** (brand logos) |
| Dates | **date-fns**, **react-day-picker** (calendar) |
| Carousel | **embla-carousel-react** (post previews) |
| Uploads | **react-dropzone** (composer media) |
| AI | **OpenAI** REST API — `gpt-4o-mini` (text), `gpt-image-1` (images), `sora-2` (video) |

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. (Optional) add your OpenAI key for live AI — create a .env file (see below)

# 3. Start the dev server
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The root path `/` redirects
to the dashboard at `/epcc-demo/command-center`.

---

## Environment variables

The app reads a single variable, in `.env` at the project root:

```env
VITE_OPENAI_API_KEY="sk-..."
```

- **Set it** → AI features call OpenAI live (post drafting, ideas, hashtags, images, chat).
- **Leave it unset** → every AI feature still works, falling back to built-in EPCC sample
  content. The UI labels each result as `openai` or `fallback` so you can see which path ran.

> ⚠️ Because the variable is prefixed `VITE_`, Vite **bundles it into the client JavaScript**.
> Anyone using the deployed site can read the key. See [Security notes](#security-notes).
> `.env` is gitignored and must never be committed.

---

## Available scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc --noEmit`) **then** produce a production build in `dist/` |
| `npm run preview` | Serve the built `dist/` locally to verify the production bundle |
| `npm run typecheck` | Type-check only, no build |

---

## How the app is wired

```
index.html
  └─ src/main.tsx            mounts <App/> into #root (React StrictMode)
       └─ src/App.tsx        defines the router (createBrowserRouter)
            └─ EpccDemoLayout.tsx   sidebar + header shell, wraps everything in
                 │                  <PostsProvider> and <AiChatProvider>
                 ├─ <Outlet/>       renders the active screen with a Framer Motion
                 │                  fade/slide transition on route change
                 └─ AiAssistantWidget   floating AI chat bubble (present on every page)
```

- **`main.tsx`** — React entry point; imports global styles (`index.css`) and renders `<App/>`.
- **`App.tsx`** — the entire route table. `/` and any unknown path (`*`) redirect to the
  Command Center. All real screens are children of `EpccDemoLayout` and live under `/epcc-demo`.
- **`EpccDemoLayout.tsx`** — the persistent shell: left sidebar navigation, top header
  (org name + the demo persona "Sara Al-Otaibi · Social Media Manager"), a 24/7 support
  card, and the animated `<Outlet/>` where screens render. It also mounts the two React
  context providers and the floating AI widget.

---

## Routing & screens

Routes are centralised as an enum in `src/modules/EpccDemo/routes.ts`. All routes are
public (no auth) and namespaced under `/epcc-demo`.

| Route | Screen file | Purpose |
|-------|-------------|---------|
| `/epcc-demo/command-center` | `CommandCenter.tsx` | Dashboard: aggregate KPIs (followers, reach, engagement, mentions, sentiment), 8-month reach/engagement trend, followers-by-platform chart, and an AI insight strip. KPIs update live as posts are scheduled/published/deleted. |
| `/epcc-demo/accounts` | `Accounts.tsx` | Connected accounts per network — followers, engagement rate, reach, growth, sync status (`connected` / `attention` / `syncing` / `disconnected`), and an "add a connector" area. |
| `/epcc-demo/posts` | `PostsAnalytics.tsx` | The posts workspace — list of posts (scheduled / published / draft) with per-post metrics, and the entry point to create/edit posts via the composer. |
| `/epcc-demo/posts/:id` | `PostDetail.tsx` | A single post: full content, per-platform previews, metrics, and comments (drawn only from the platforms the post actually published on). |
| `/epcc-demo/composer` | → redirects to **Posts** | Composing happens inside the Posts workspace (the `Composer.tsx` guided multi-step flow opens there). |
| `/epcc-demo/calendar` | `CalendarView.tsx` | Month grid (June 2026) showing scheduled posts on their day/time, sourced from the shared posts store. |
| `/epcc-demo/audience` | `AudienceInsights.tsx` | Demographics (gender, age, cities), interests, sentiment themes, plus rich per-platform behaviour: best time, top format, watch time, device/language split, hashtags, active-hours heatmap. |
| `/epcc-demo/reports` | `Reports.tsx` | Saved weekly/monthly performance reports with per-platform breakdowns, top posts, follower growth and an AI-written summary. |
| `/epcc-demo/promotion` | `Promotion.tsx` | Paid promotion / ad campaign planner, including an AI-generated campaign-plan modal. |
| `/epcc-demo/inbox` | `Inbox.tsx` | Unified inbox of comments, DMs and mentions across platforms, with assignees (team members) and canned "saved replies". |
| `/epcc-demo/ai-assistant` | `AiAssistant.tsx` | Full-page AI chat — plan content, write posts, find best times, analyse performance. Shares its conversation with the floating widget. |
| `/epcc-demo/support` | `Support.tsx` | 24/7 support chat with an AI agent persona; escalates "urgent" issues with a hotline number. |

### The composer (`Composer.tsx`)

A guided, multi-step "create / edit post" flow (opened from the Posts workspace). It
supports:
- Selecting one or more target platforms.
- **Per-platform fields** defined in `posts.ts` (`PLATFORM_FIELDS`) — e.g. X threads &
  reply controls, Instagram first-comment/location/collaborator, LinkedIn document
  attachment, TikTok sound/Duet/Stitch.
- **Content formats** (`post`, `reel`, `story`, `video`) with `FORMAT_SUPPORT` flagging
  which platforms accept each format.
- Media upload (react-dropzone), AI caption/idea/hashtag/image/video generation, and
  best-time suggestions pulled from the engagement heatmap.

---

## The mock data layer

Everything the UI shows comes from `src/mock-server/` — plain TypeScript fixtures designed
to be internally consistent (e.g. follower counts sum to the 767.1K shown on the dashboard).

| File | Contents |
|------|----------|
| `platforms.ts` | The six-platform catalogue: brand icons, brand colours, chart-safe colours, Instagram gradient, lookup helpers. |
| `accounts.ts` | `IConnectedAccount[]` — per-network followers, engagement, reach, growth, sync status. |
| `kpis.ts` | Command Center aggregate KPIs, the 8-month reach/engagement `TREND`, and followers-by-platform. |
| `posts.ts` | Post types/formats, per-platform composer fields, format-support matrix, and the seed `POSTS` array. |
| `audience.ts` | Demographics, interests, sentiment themes, and rich per-platform `IAudienceView` insights. |
| `besttime.ts` | The day×hour engagement `HEATMAP` (drives both the audience heatmap and composer time chips), per-format best times, and suggested slots. |
| `inbox.ts` | Conversations (comment/DM/mention), team members, and saved replies. |
| `reports.ts` | Saved weekly/monthly reports with breakdowns, top posts and summaries. |
| `ai.ts` | Canned AI environment summary + content suggestions (used when offline). |
| `posts-store.tsx` | **React context** — the live, mutable posts store (see below). |
| `ai-chat-store.tsx` | **React context** — the shared AI chat conversation. |

---

## State management

No Redux/Zustand — just two React contexts mounted in the layout:

- **`PostsProvider` / `usePosts()`** (`posts-store.tsx`)
  Holds the mutable list of posts and exposes `addPost`, `updatePost`, `deletePost`,
  `loadSample`, `clearAll`. Because the Command Center, Calendar and Posts workspace all
  read from this one store, creating/editing/deleting a post updates **everywhere in real
  time**. `mockPublishMetrics()` fabricates plausible reach/likes/comments when a post is
  published. State is in-memory and **resets on reload**.

- **`AiChatProvider` / `useAiChat()`** (`ai-chat-store.tsx`)
  Holds the single AI conversation (`messages`, `typing`, `send`, `reset`). The floating
  widget and the full AI Assistant page share this same history, so switching between them
  preserves the conversation and any in-progress reply.

---

## AI integration

All AI logic lives in `src/modules/EpccDemo/_services/openai.ts` — a lightweight,
client-side OpenAI client. Key behaviours:

- Reads `VITE_OPENAI_API_KEY`. `hasOpenAIKey()` gates every call.
- **Graceful fallback:** if the key is missing or a request fails, each function returns
  built-in EPCC sample content and reports `source: 'fallback'` plus the `error` message,
  so the UI shows what happened instead of failing silently.
- A shared **system prompt** keeps the model in the EPCC brand voice (Saudi Vision 2030,
  SMEs, trade, investment, events).

| Function | Model | Used for |
|----------|-------|----------|
| `generatePost(brief, platform)` | `gpt-4o-mini` | Draft a ready-to-publish caption (<280 chars, emojis, hashtags). |
| `generateIdeas(context, count)` | `gpt-4o-mini` | A JSON list of content ideas (title + detail). |
| `generateMeta(text)` | `gpt-4o-mini` | Hashtags, an SEO title, and image alt text. |
| `generateInsight(context, fallback)` | `gpt-4o-mini` | A 1–2 sentence actionable insight (e.g. the dashboard strip). |
| `assistantReply(message, turn)` | `gpt-4o-mini` | The AI Assistant / floating widget chat. |
| `supportReply(message, turn)` | `gpt-4o-mini` | The Support screen chat agent. |
| `generateImage(prompt)` | `gpt-image-1` | On-brand social visuals (returns base64 → data URL; falls back to a picsum placeholder). |
| `generateVideo(prompt, portrait)` | `sora-2` | Short vertical/landscape video (async: create job → poll ~3 min → download mp4 blob; falls back to a sample clip). |

---

## Theming & UI

- **Tailwind CSS** with a custom token palette in `tailwind.config.js` — semantic colour
  scales (`primary-*`, `secondary-*`, `accent-*`, `neutral-*`, `surface-*`, `text-*`) and
  the **Poppins / Sora** font families used across the shell.
- **shadcn/ui** components live in `src/shadecn/components/ui/` (button, input, textarea,
  select, popover, calendar) with the `cn()` class-merge helper in `src/shadecn/lib/utils.ts`.
- **Local building blocks** in `src/modules/EpccDemo/_components/` — e.g. `ui.tsx`
  (cards, section titles, badges), `form.tsx`, `motion.tsx`, the AI widgets
  (`AiChat`, `AiAssistantWidget`, `AiButton`, `AiThinking`, `AiInsightStrip`), post
  previews (`PostPreview`, `PostSheet`, `PostThumb`, `PostMedia`, `PreviewCarousel`),
  the `Heatmap`, `ImageGenLoader`, and `ScreenGlow`.

---

## Project structure

```
epcc-app/
├─ index.html                  Vite entry HTML
├─ package.json                scripts & dependencies
├─ vite.config.ts              Vite + React plugin, "@" → /src alias
├─ tailwind.config.js          design tokens, fonts, plugins
├─ postcss.config.js           Tailwind/autoprefixer
├─ tsconfig*.json              TypeScript config
├─ .env                        VITE_OPENAI_API_KEY (gitignored)
└─ src/
   ├─ main.tsx                 React root
   ├─ App.tsx                  router / route table
   ├─ index.css                global styles + Tailwind layers
   ├─ vite-env.d.ts            Vite type shims
   ├─ mock-server/             all fixtures + the two context stores
   ├─ modules/EpccDemo/
   │  ├─ EpccDemoLayout.tsx    app shell (sidebar, header, providers)
   │  ├─ routes.ts             route constants (enum)
   │  ├─ screens/              one file per screen (see routing table)
   │  ├─ _components/          presentational + AI widgets
   │  └─ _services/openai.ts   the OpenAI client + fallbacks
   ├─ shadecn/                 shadcn/ui components + utils
   └─ shared/UI/               shared Button wrapper + barrel export
```

---

## Deployment

It's a static SPA — `npm run build` emits `dist/`, deployable to any static host
(Vercel, Netlify, S3, GitHub Pages, …).

Two things to configure on the host:
1. **SPA fallback** — rewrite all routes to `index.html` so deep links like
   `/epcc-demo/posts/:id` work on refresh.
2. **`VITE_OPENAI_API_KEY`** — set it as a build-time env var **only if** you accept that
   it ships to the client (see below). Otherwise deploy without it and rely on the
   built-in fallbacks.

---

## Security notes

- **The OpenAI key is exposed to the browser.** `VITE_`-prefixed variables are inlined into
  the client bundle by design. For anything beyond a throwaway demo, move OpenAI calls
  behind a small backend / serverless proxy and keep the key server-side. **Rotate the key**
  if it has ever been committed or shipped publicly.
- **No authentication.** Every route is public; the persona in the header is hard-coded.
- **No persistence.** All state is in-memory and resets on reload — there is no real data
  to protect, and no posts are ever actually published to any social network.

---

*Internal demo for the Eastern Province Chamber of Commerce. Not affiliated with X,
Meta, LinkedIn, Snap or TikTok; brand logos are used only to identify the platforms.*
