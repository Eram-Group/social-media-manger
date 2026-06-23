# EPCC Social Demo — Development Guide

Standalone, client-side demo of a unified social-media management platform for the
**Eastern Province Chamber of Commerce** (X, Instagram, LinkedIn, Facebook, Snapchat, TikTok).
No backend — all data is mock/in-memory. AI features call OpenAI when a key is present,
otherwise they fall back to canned content.

## Tech Stack
- **React 18** + **TypeScript 5** + **Vite 5**
- **Tailwind CSS 3.4** with a custom theme (primary/secondary/accent/neutral scales, `Sora`/`Poppins` fonts, `shadow-1..7`)
- **shadcn/ui** primitives in `src/shadecn/` (note the `shadecn` spelling)
- **React Router v6** (`createBrowserRouter`)
- **Framer Motion** (animation), **Recharts** (charts), **Embla** (carousels), **react-day-picker** (calendar), **react-dropzone** (upload)
- **lucide-react** + **react-icons/fa6** (brand icons)
- **MSW** (Mock Service Worker) — optional mock API, enabled in mock mode

## Project Structure
```
src/
├── modules/EpccDemo/        # the whole UI
│   ├── EpccDemoLayout.tsx    # responsive shell (sidebar drawer + header)
│   ├── routes.ts             # EPCC_ROUTES enum (paths under /epcc-demo)
│   ├── screens/              # one file per page (CommandCenter, PostsAnalytics, PostDetail, CalendarView, Inbox, Promotion, AiAssistant, AudienceInsights, Reports, Accounts, Support)
│   ├── _components/          # shared UI (ui.tsx, form.tsx, PostPreview, PreviewCarousel, PostMedia, PostThumb, AiButton, AiChat, AiThinking, ScreenGlow, AiAssistantWidget, …)
│   └── _services/            # openai.ts (text/image/video with graceful fallbacks)
├── mock-server/             # the demo's DATA + mock API layer
│   ├── posts.ts, accounts.ts, audience.ts, kpis.ts, reports.ts,
│   │   inbox.ts, besttime.ts, platforms.ts, ai.ts   # in-memory mock data
│   ├── posts-store.tsx, ai-chat-store.tsx           # React context stores
│   ├── handlers.ts           # MSW REST handlers (served under VITE_API_BASE = /api)
│   └── browser.ts            # setupWorker(...handlers)
├── shadecn/                 # cn() util + vendored shadcn primitives (button, input, textarea, popover, select, calendar)
├── shared/UI/               # Button (imported as @UI/index)
├── App.tsx                  # router (mounts EpccDemoLayout + screens; / → dashboard)
└── main.tsx                 # entry; starts MSW only when VITE_ENABLE_MSW=true
```

## Path Aliases
```
@/*    -> src/*
@UI/*  -> src/shared/UI/*
```
(Defined in both `vite.config.ts` and `tsconfig.json`.)

## Conventions
- **Interfaces** `IXxx`, **types** `TXxx`, **enums** `EXxx` (e.g. `EPCC_ROUTES`)
- Screens are PascalCase default exports under `screens/`
- Use `cn()` from `@/shadecn/lib/utils` for class merging
- All demo data lives in `src/mock-server/`; screens read it via direct import or the context stores (`usePosts()`, `useAiChat()`)
- Tailwind tokens only (no raw hex unless intentional accents): `primary-800`, `secondary-200`, `neutral-*`, `text-dark`, `text-red`, `warnings-success/successBg`, `surface-background`, `font-Sora`, `shadow-7`
- Keep everything **client-side** — no real network calls except OpenAI

## Run
```bash
npm install
npm run dev          # normal — MSW off, UI reads mock data in-memory
npm run dev:mock     # mock mode — starts the MSW mock server (VITE_ENABLE_MSW=true)
npm run build        # tsc --noEmit && vite build
npm run preview
```

## Env
- `.env` (all modes): `VITE_OPENAI_API_KEY`, `VITE_API_BASE=/api`, `VITE_ENABLE_MSW=false`, `VITE_IS_LOCAL=true`
- `.env.mock` (mock mode): `VITE_API_BASE=/api`, `VITE_SOCKET_URL=`, `VITE_ENABLE_MSW=true`, `VITE_IS_LOCAL=false`

## Mock server (MSW)
`src/mock-server/handlers.ts` serves the demo data over `/api/*` (posts, posts/:id, accounts,
kpis, reports, inbox, audience, besttime, ai/suggestions, health). MSW intercepts in the
**browser** (service worker, `public/mockServiceWorker.js`) — visible in the Network tab, not via curl.
The UI currently reads data in-memory; the API layer is ready for wiring screens to `fetch`.

## Verify after changes
```bash
npm run build   # tsc + vite build must pass
```

## Docs
- `docs/ROADMAP.md` — the EPCC demo plan / roadmap
- `docs/ux-recommendations.md` — competitor UX ideas (shipped vs remaining)
- `docs/design-system.md` — design tokens / components reference
- `docs/mocking.md` — mocking notes
- `.claude/skills/` — frontend skills (create-component, create-page, frontend-structure)
