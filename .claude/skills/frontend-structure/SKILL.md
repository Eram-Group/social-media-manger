---
name: frontend-structure
description: Use when working anywhere in the URViral client (client/ — agora-influence) to orient yourself — where files live, the path aliases, the module/shared/shadecn layout, naming conventions, and which patterns to follow before adding or changing code.
---

# URViral client — file structure & conventions

Orientation map for `client/` (`agora-influence`): React 18 + Vite + TS, Redux Toolkit (UI state), SWR (server state), Tailwind + shadcn (`src/shadecn`, note spelling), React Router v6, React Hook Form + Yup, Socket.IO. Full pattern reference: `client/CLAUDE.md`. Index: `documentation/client/frontend-index.md`.

## Where things live (`client/src`)
- `app/api/services/` — singleton service classes + `api.ts` (axios). One file per domain: `<domain>.service.ts`.
- `app/api/types/` — `I`-prefixed interfaces (`api.types.ts` has `IResponse<T,'list'|'single'>`).
- `app/constants/` — `endpoints.ts` (`EAPI`), `routes.ts` (`ROUTES`), `enums.ts` (`EUserType`, `EModeType`…), `keys.ts`, `swrkeys.ts` (`SWR_KEYS`).
- `app/router/` — `index.tsx` (`createBrowserRouter`), `AuthLoader.tsx`, `WithRoleAuthWrapper.tsx`.
- `modules/<Feature>/` — feature code. Internal: `_components/ _layouts/ _views/ _pages/ _slices/ _hooks/` + a `<Feature>.tsx` entry.
- `shared/UI/` — reusable library (`Main*`, `Button`) exported from `index.ts` → import `from '@UI/index'`.
- `shared/layouts/` — `AppLayouts`, `ErrorBoundary`.
- `shadecn/` — shadcn primitives (`components/ui/*`), `lib/utils.ts` (`cn()`).
- `store/` — `store.ts` + global `slices/` (auth, sidebar, pageHeader, agencyMode, service…).
- `hooks/` — cross-feature hooks (`useErrorToast`, `useDebounce`, `useFilter`, `use-get-*-options`).
- `context/` — `socket-context`, `theme-context`. `mocks/` — MSW. `assets/` — icons/illustrations.

## Path aliases (use these, not relative `../../`)
`@UI`→`shared/UI` · `@services`→`app/api/services` · `@servicesTypes`→`app/api/types` · `@constants`→`app/constants` · `@app` · `@assets` · `@hooks` · `@store` · `@`→`src`.

## Naming
Interfaces `IUser`; types `TTokens`; enums `EUserType`; shared UI `Main<Name>`; hooks `use<Name>`; services `<domain>.service.ts` (frozen singleton); components PascalCase default-export; private feature dirs underscore-prefixed.

## Before you add code — decide placement
- Reusable across features (input, modal, table, badge)? → `shared/UI/` (see `create-component` skill).
- Belongs to one feature? → `modules/<Feature>/_components/` (or `_views`/`_pages`).
- A new screen with a route? → use the `create-page` skill.
- Server data call? → add a method to the relevant `@services/*.service.ts` (singleton, returns `IResponse`), expose via a `use-get-*` SWR hook.
- Global UI state? → a slice in `store/slices`. Feature-only state? → `modules/<Feature>/_slices`.

## Always
- Merge classes with `cn()`; style with Tailwind **semantic tokens** (see `documentation/client/design-system.md`), never arbitrary colors.
- Reuse `@UI/index` components before writing new ones.
- Forms = React Hook Form + Yup with `<Form>/<FormField>`.
- Errors = `useErrorToast`. Pages set their title via `dispatch(setPage({ title }))`.
- Run without a backend using `npm run dev-msw` (MSW mocks).
