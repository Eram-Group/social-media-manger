---
name: create-page
description: Use when adding a new routed screen/page to the URViral client (client/) — creates the page component, registers the route constant, wires it into the router with the right auth/role guard, and adds it to navigation. Follow every step in order.
---

# Create a new page — URViral client

A "page" = a routed screen under `/app/*` (protected) or a public route. Reference: `documentation/client/frontend-index.md`, `client/CLAUDE.md`.

## Checklist
1. Add a route constant to `src/app/constants/routes.ts`.
2. Create the page component in `src/modules/<Feature>/<PageName>.tsx`.
3. Register the route in `src/app/router/index.tsx` (with guard).
4. (If it should appear in the menu) add a nav item in the sidebar.
5. Verify with `npm run dev-msw` (no backend needed).

## 1. Route constant — `src/app/constants/routes.ts`
Add to the `ROUTES` enum, grouped with related routes. Protected app routes start with `/app/`.
```ts
// inside enum ROUTES
REPORTS = '/app/reports',
REPORTS_DETAILS = '/app/reports/:id',
```

## 2. Page component — `src/modules/<Feature>/<PageName>.tsx`
Every page sets the page-header title on mount and uses SWR for data. Default export, PascalCase.
```tsx
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { setPage } from '@store/slices/pageHeaderSlice';
import { SWR_KEYS } from '@constants/swrkeys';
import reportService from '@services/report.service';

export default function Reports() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setPage({ title: 'Reports' }));
  }, [dispatch]);

  const { data, isLoading } = useSWR([SWR_KEYS.REPORTS], () =>
    reportService.getList().then((res) => res?.data),
  );

  if (isLoading) return <div className="flex flex-col gap-6">{/* skeletons */}</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* content — use @UI/index components + semantic Tailwind tokens */}
    </div>
  );
}
```
Notes: add `SWR_KEYS.REPORTS` to `src/app/constants/swrkeys.ts`; add the service method (see `frontend-structure`). For a static/mock demo page you may skip SWR and render local data.

## 3. Register the route — `src/app/router/index.tsx`
Import the page and add an object to the `/app` children. Gate by role/mode with `WithRoleAuthWrapper`.
```tsx
import Reports from '@/modules/Reports/Reports';
import { ROUTES } from '@constants/routes';
import { EUserType, EModeType } from '@constants/enums';

// inside the protected /app children array:
{
  path: ROUTES.REPORTS,
  element: (
    <WithRoleAuthWrapper
      roles={[EUserType.BRAND, EUserType.INFLUENCER]}
      Component={Reports}
    />
  ),
},
```
- Public page instead? Place it at the top level (sibling of `/app`) without the role wrapper (follow the auth/terms routes already there).
- Agency-only page? add `modes={[EModeType.AGENCY]}` and place under the agency branch.
- Match the exact shape of existing entries in the file — don't invent new wrapper props.

## 4. Navigation (optional)
If the page is reachable from the menu, add an item (label + `ROUTES.REPORTS` link + Hugeicon) to the sidebar config in `src/shared/UI/MianSidebare/`.

## 5. Verify
`cd client && npm run dev-msw`, navigate to the route, confirm the title appears in the header and the guard behaves (signed-out → redirect; wrong role → blocked).
