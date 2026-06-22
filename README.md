# EPCC — Social Media Management (Demo)

Standalone client-side demo of a unified social media management platform for the
Eastern Province Chamber of Commerce (X, Instagram, LinkedIn, Facebook, Snapchat, TikTok).

UI lives in `src/modules/EpccDemo`. The mock data + mock server live in `src/mock-server`.
AI features use OpenAI when `VITE_OPENAI_API_KEY` is set in `.env`, otherwise they fall
back to sample content.

## Run

```bash
npm install
npm run dev          # normal mode — UI reads mock data in-memory (MSW off)
npm run dev:mock     # mock mode — starts the MSW mock server (VITE_ENABLE_MSW=true)
```

`/` redirects to the dashboard.

## Mock server (MSW)

`src/mock-server/` is the demo's data layer:
- the data modules (`posts`, `accounts`, `audience`, `kpis`, `reports`, `inbox`, `besttime`, …)
- `handlers.ts` — REST endpoints served under `VITE_API_BASE` (`/api`)
- `browser.ts` — the Mock Service Worker

In **mock mode** (`npm run dev:mock`) the worker starts and serves:

| Method | Endpoint            | Returns                                  |
|--------|---------------------|------------------------------------------|
| GET    | `/api/posts`        | all posts                                |
| GET    | `/api/posts/:id`    | a post + its analytics                   |
| GET    | `/api/accounts`     | connected accounts                       |
| GET    | `/api/kpis`         | KPIs, followers-by-platform, trend       |
| GET    | `/api/reports`      | reports                                  |
| GET    | `/api/inbox`        | conversations, team, saved replies       |
| GET    | `/api/audience`     | interests, sentiment                     |
| GET    | `/api/besttime`     | heatmap, slots, recommendations          |
| GET    | `/api/ai/suggestions` | AI suggestions                         |
| GET    | `/api/health`       | `{ ok: true }`                           |

> MSW intercepts in the **browser** (service worker), so endpoints are visible in the
> browser Network tab / console, not via `curl`.

## Env

`.env` (all modes) — OpenAI key + defaults (`VITE_ENABLE_MSW=false`).
`.env.mock` (mock mode) — turns the mock server on:

```
VITE_API_BASE=/api
VITE_SOCKET_URL=
VITE_ENABLE_MSW=true
VITE_IS_LOCAL=false
```

## Scripts
- `npm run dev` / `npm run dev:mock` — dev server (normal / mock)
- `npm run build` / `npm run build:mock` — typecheck + production build
- `npm run preview` — preview the build
