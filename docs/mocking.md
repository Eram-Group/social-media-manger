# Full-App Mock Mode (MSW) — run the whole client with no backend

> Lets you click through the **entire real app** (not the EPCC demo) on mock data, to learn how every flow works. Built on MSW (Mock Service Worker). Themed for the Eastern Province Chamber of Commerce.

## Run it
```bash
cd client && npm install
npm run dev:mock        # http://localhost:4000
```
- `dev:mock` runs Vite with `--mode mock`, which loads `.env` + **`.env.mock`** (`VITE_ENABLE_MSW=true`, `VITE_API_BASE=/api`). Firebase/Stripe keys are inherited from `.env`, so messaging init doesn't crash.
- On boot, `src/main.tsx` starts the MSW worker **only** when `VITE_ENABLE_MSW==='true'`, then renders. (Normal `npm run dev` is unaffected — no worker.)

> Note: the old `dev-msw` script used Windows `set` syntax and the previous `enableMocking()` had inverted logic (both meant MSW never actually started). Use **`npm run dev:mock`**.

## Logging in
1. Open `http://localhost:4000/` → you're redirected to `/auth/signin`.
2. Enter **any** valid-looking email + any password.
   - Email starting with **`inf`** (e.g. `inf@epchamber.sa`) → logs in as an **influencer** (Service Hub, drafts, agency, etc.).
   - Any other email (e.g. `media@epchamber.sa`) → logs in as a **brand** (Dashboard, Marketplace, Discover, Job Hub, Campaigns).
3. You land on the Dashboard. Sign-in returns a mock JWT whose `exp` is 10 years out, so you stay logged in; the user comes with `organization` set, so you skip the create-org gate.

Role gating is real (`WithRoleAuthWrapper`), so to see the *other* half of the app, log out and sign in with the other email prefix.

## How it works
- **Envelope contract:** services do `const { data } = await api.get(...)` and the UI reads `res.data`. So handlers return `{ data: {...} }` (single) or `{ data: [...], total, page, limit }` (list). Helpers in `src/mocks/_data/shared.ts`: `single()`, `list()`.
- **Consistent identities:** `USER_ID`, `ORG_ID`, and reference arrays (`PLATFORMS`, `CATEGORIES`, `COUNTRIES`, `LANGUAGES`, `SKINS`, `HAIRS`) in `shared.ts` keep data consistent across screens.
- **URL matching:** handlers match `*/path` (leading wildcard) so they work regardless of base URL; path params use `:id`.
- **Safety net:** `handlers.ts` registers a fallback **last** that answers any unmatched `*/api/*` request with a benign envelope (`{data:[]}` for GET, `{data:{success:true}}` for writes) — so an endpoint nobody hand-tuned renders an empty state instead of a network error. It is scoped to `/api/` so it never touches Vite assets, Firebase or sockets (those bypass).

## File layout (`src/mocks/`)
```
browser.ts              setupWorker(...handlers)   (unchanged)
handlers.ts             aggregates all domain handlers + the /api/* fallback
_data/shared.ts         IDs, mock-JWT builder, buildUser, single()/list(), reference data
_data/*.ts              existing chat/org fixtures (reused)
handlers/
  auth.ts               signin/signup/refresh/forgot/reset/confirm-email/users
  user.ts               /user/profile (get/patch), change-password, delete
  organization.ts       org list/detail/by-user/account-type/switch, SM connectors, work-projects, members
  core.ts               static refs, dashboards, notifications, payments, blob
  services.ts           service hub + job hub (+ analytics envelope fields)
  gigs-campaigns.ts     posts, gigs, campaigns, products, campaign-services
  marketplace.ts        brand marketplace, hot services, discover, shareable links
  agency.ts             agency activate, creators, services, catalogs, invitations
  chat.ts               rooms, messages, search, files-links (reuses fixtures)
```

## Coverage & limits
- **Covered:** auth + the full authenticated app surface (every endpoint in `EAPI`) has either a tailored handler or the safe fallback. Lists are seeded with realistic EPCC-themed items.
- **Static only:** data is fixture-based — writes (create/schedule/delete) return success and show toasts but don't persist across reloads. Real-time (Socket.IO) and Firebase push are not mocked (they bypass and fail silently).
- **Verified here:** TypeScript compiles, the worker is served, and the app boots in mock mode with no transform errors. Visual per-screen correctness should be confirmed by clicking through in a browser — if any screen shows an empty state where you expect data, that endpoint hit the fallback and its handler can be enriched (find it by name in `handlers/` and add fields).

## Extending a handler
Find the domain file in `src/mocks/handlers/`, locate the `rest.<verb>('*/<path>', ...)` entry (or add one before the fallback), and return `single({...})` / `list([...])` with the fields the component reads. Keep IDs consistent with `shared.ts`.
