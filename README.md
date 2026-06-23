<div align="center">

# EPCC — Social Media Management Platform

**A unified social-media command center for the Eastern Province Chamber of Commerce**
Manage X · Instagram · LinkedIn · Facebook · Snapchat · TikTok — from one place.

_Client-side product demo · React + TypeScript + Vite · mock data · AI-assisted_

</div>

---

## Overview

This is a fully interactive **front-end demo** of a unified social-media management platform built for the
**Eastern Province Chamber of Commerce (EPCC)**. It shows how the Chamber's social team would plan, publish,
moderate, analyse and promote content across all six major networks from a single workspace.

The app runs **entirely in the browser** — there is no backend to deploy. All content is realistic
**mock data**, and the AI features call OpenAI when a key is provided (with graceful sample fallbacks otherwise).

> **Goal:** a believable, polished demo where the numbers reconcile across screens and every flow feels real.

---

## ✨ Features

| Area | What it does |
|------|--------------|
| **Command Center** | Unified dashboard — KPIs (followers, reach, engagement), follower split by platform, trend chart, this-week schedule strip and recently-published feed. Live values update as you create/schedule posts. |
| **Posts** | Browse posts in **list / table / grid** views with media thumbnails, search, status & platform filters, bulk actions, and a stepped **Composer** wizard (Setup → Content → Customize → Schedule) with per-platform fields, AI generation and live previews. |
| **Post Analytics** | Full per-post report — 12+ metrics with deltas, reach/impressions curve, engagement & reactions mix, traffic sources, reach by platform, **audience demographics** (age, gender, engagement-by-hour), a moderated **comments** panel (reply, hide, block, like), a media **lightbox**, and a per-platform **live preview**. |
| **Content Calendar** | Week / Month / Queue views with **drag-and-drop** rescheduling, per-day post counts, and click-a-day-to-create. Stays in sync with Posts. |
| **Inbox** | Unified comments, messages and mentions across platforms — reply, assign to team, resolve, saved replies, and a **contact profile** panel. |
| **Paid Promotion** | A guided **"Plan with AI"** flow: answer a few questions → a full-screen "thinking" effect → an AI-built campaign (objective, audience, post-aware platforms, budget) with **predicted results** and cost-per-result. |
| **AI Assistant** | A full-page chat plus a **floating assistant** on every screen — plan content, write captions, find best times, analyse performance. Shared conversation, markdown-formatted replies. |
| **Audience Insights** | Demographics, interests, sentiment and platform skews with selectable data views. |
| **Reports** | Periodic performance reports with breakdowns and top posts (filterable). |
| **Accounts** | Connected-account management with per-platform status, followers, engagement and sync state. |
| **Support** | In-app help / contact section. |

All screens share a **consistent dataset** — follower totals, reach figures and engagement reconcile across the
dashboard, accounts, audience and per-post analytics.

---

## 🧰 Tech Stack

- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS 3.4** — custom design system (primary/secondary/accent/neutral scales, `Sora`/`Poppins` fonts, shadow tokens)
- **shadcn/ui** primitives (`src/shadecn/`)
- **React Router v6** (`createBrowserRouter`)
- **Framer Motion** (animation) · **Recharts** (charts) · **Embla** (carousels) · **react-day-picker** (calendar) · **react-dropzone** (uploads)
- **lucide-react** + **react-icons** (brand icons)
- **MSW** (Mock Service Worker) — optional in-browser mock API
- **OpenAI** — text (`gpt-4o-mini`), images (`gpt-image-1`), video (`sora-2`), all with fallbacks

---

## 🚀 Getting Started

**Prerequisites:** Node.js 18+ and npm.

```bash
# install
npm install

# run (normal mode — UI reads mock data in-memory)
npm run dev

# run with the MSW mock API enabled
npm run dev:mock
```

Open the printed URL — `/` redirects to the dashboard.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (MSW off) |
| `npm run dev:mock` | Dev server with the MSW mock server on |
| `npm run build` | Type-check + production build |
| `npm run build:mock` | Build in mock mode |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |

---

## 🔑 Environment

Create / edit `.env` (loaded in all modes):

```ini
VITE_OPENAI_API_KEY="sk-..."   # optional — enables live AI; omit for sample fallbacks
VITE_API_BASE=/api
VITE_ENABLE_MSW=false
VITE_IS_LOCAL=true
```

`.env.mock` (loaded with `npm run dev:mock`) turns the mock server on:

```ini
VITE_API_BASE=/api
VITE_SOCKET_URL=
VITE_ENABLE_MSW=true
VITE_IS_LOCAL=false
```

> The OpenAI key is read client-side via `import.meta.env`. Don't commit a real key to a public repo.

---

## 🗂️ Project Structure

```
src/
├── modules/EpccDemo/        # the UI
│   ├── EpccDemoLayout.tsx    # responsive shell (collapsible sidebar + header)
│   ├── routes.ts             # EPCC_ROUTES (paths under /epcc-demo)
│   ├── screens/              # one file per page
│   ├── _components/          # shared UI (cards, forms, previews, AI widgets…)
│   └── _services/            # openai.ts
├── mock-server/             # the demo's data + mock API
│   ├── *.ts                  # posts, accounts, audience, kpis, reports, inbox, besttime, platforms, ai
│   ├── posts-store.tsx       # shared posts state (CRUD across screens)
│   ├── ai-chat-store.tsx     # shared AI conversation
│   ├── handlers.ts           # MSW REST endpoints
│   └── browser.ts            # MSW worker
├── shadecn/                 # cn() + vendored shadcn primitives
├── shared/UI/               # Button (@UI/index)
├── App.tsx                  # router
└── main.tsx                 # entry (boots MSW in mock mode)
```

**Path aliases:** `@/* → src/*`, `@UI/* → src/shared/UI/*`.

---

## 🧪 Mock Server (MSW)

In **mock mode** (`npm run dev:mock`), a Mock Service Worker serves the demo data over `VITE_API_BASE` (`/api`):

| Method | Endpoint | Returns |
|--------|----------|---------|
| GET | `/api/posts` | all posts |
| GET | `/api/posts/:id` | a post + its analytics |
| GET | `/api/accounts` | connected accounts |
| GET | `/api/kpis` | KPIs, followers-by-platform, trend |
| GET | `/api/reports` | reports |
| GET | `/api/inbox` | conversations, team, saved replies |
| GET | `/api/audience` | interests, sentiment |
| GET | `/api/besttime` | heatmap, slots, recommendations |
| GET | `/api/ai/suggestions` | AI suggestions |
| GET | `/api/health` | `{ ok: true }` |

> MSW intercepts in the **browser** (service worker), so responses appear in the Network tab — not via `curl`.
> The UI currently reads data in-memory; the API layer is ready for wiring screens to `fetch`.

---

## 🤖 AI Features

When `VITE_OPENAI_API_KEY` is set, the demo uses OpenAI for:
- **Caption / post generation**, **tags & SEO**, **best-time** suggestions (text)
- **Image generation** in the Composer (`gpt-image-1`)
- **Video generation** (`sora-2`, async create → poll → download)
- The **AI Assistant** chat and **Plan with AI** promotion flow

Every AI call has a **graceful fallback** to sample content, so the demo works fully without a key.

---

## 📱 Responsive

The shell adapts from desktop to mobile: the fixed sidebar collapses into a **slide-in drawer with a
hamburger** below `lg`; padding, headers, the Inbox panes and wide tables all reflow for small screens.

---

## ☁️ Deployment

Configured for **Vercel** (`vercel.json`) — Vite framework, `dist` output, SPA rewrite to `index.html`.

```bash
npm run build      # produces dist/
# deploy dist/ to any static host (Vercel, Netlify, Azure Static Web Apps, S3+CloudFront…)
```

Add `VITE_OPENAI_API_KEY` (and any `VITE_*` vars) in your host's environment settings to enable live AI.

---

## 📚 Docs

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — the EPCC demo plan / roadmap
- [`docs/ux-recommendations.md`](docs/ux-recommendations.md) — competitor UX ideas (shipped vs remaining)
- [`docs/design-system.md`](docs/design-system.md) — design tokens & components
- [`docs/mocking.md`](docs/mocking.md) — mocking notes
- [`CLAUDE.md`](CLAUDE.md) — contributor / AI-agent guide

---

## 📝 Notes

- **Demo only** — no real accounts are connected and nothing is posted to any network.
- Sample media uses public placeholder images/video; swap in real Chamber assets for a production look.
- All metrics are illustrative mock data designed to be internally consistent.

<div align="center"><sub>Built as a product demo for the Eastern Province Chamber of Commerce.</sub></div>
