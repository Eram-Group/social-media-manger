# LinkedIn Connector — Go-Live Setup

The LinkedIn connector code is complete (see `docs/superpowers/specs/2026-06-30-linkedin-connector-design.md`).
This is the operational checklist to make it work against a **real** LinkedIn Organization Page.

> The connector is **build-green** — it compiles and is code-reviewed, but the LinkedIn API
> request/response shapes have not been exercised live. Expect to adjust a field name or two
> against current LinkedIn docs during first testing (the code marks these spots).

---

## 1. Prerequisites

- The Chamber's **LinkedIn Company/Organization Page** must exist.
- You must be an **Administrator** of that Page (the connector only lists orgs where the
  authorizing user is an APPROVED ADMINISTRATOR).

## 2. Create the LinkedIn app

1. Go to **https://www.linkedin.com/developers/apps** → **Create app**.
2. Associate it with the Chamber's **Company Page** (required).
3. **Products** tab — request:
   - **Sign In with LinkedIn using OpenID Connect** (gives `openid`, `profile`).
   - **Community Management API** (gives `w_organization_social`, `r_organization_social`,
     `rw_organization_admin` — org posting + read-back + follower stats).
     > This is the gating step — the LinkedIn analogue of Meta App Review. Access may require
     > review/verification. Without it, org posting scopes won't be granted.
4. **Auth** tab:
   - Copy **Client ID** and **Client Secret**.
   - Add the **Authorized redirect URL** exactly:
     `http://localhost:3000/api/connect/linkedin/callback` (and your production
     `https://<your-app>/api/connect/linkedin/callback`).
   - Ensure **refresh tokens** are enabled (so the token response includes `refresh_token`;
     the connector's `ensureFreshToken` depends on it).

## 3. Configure env

In `.env.local` (copy from `.env.local.example`):

```ini
APP_BASE_URL=http://localhost:3000
LINKEDIN_CLIENT_ID=<your client id>
LINKEDIN_CLIENT_SECRET=<your client secret>
# LINKEDIN_VERSION=202401   # optional; bump if LinkedIn deprecates it
# DATABASE_URL=...          # optional — without it, accounts persist to local .data/ JSON
```

The redirect URL is built from `APP_BASE_URL` (`src/server/env.ts` → `redirectUri('linkedin')`),
so `APP_BASE_URL` must match what you registered in step 2.

## 4. Connect the Page

1. `npm run dev`
2. Open `/epcc-demo/accounts` → **Connect** on LinkedIn (or hit `/api/connect/linkedin` directly).
3. Approve the LinkedIn consent screen.
4. You should be redirected to `/epcc-demo/accounts?connected=linkedin&count=N` and the org
   Page appears as a connected account (token stored server-side).
   - If you administer no orgs → `?error=no_orgs`.
   - If env is missing → `/api/connect/linkedin` returns "LinkedIn is not configured."

## 5. Test the flows

- **Publish**: Composer → select LinkedIn → text, then image, multi-image, and video posts →
  each should appear on the Page; the Composer shows a permalink.
- **Delete**: delete a published LinkedIn post → it disappears from the Page.
- **Read-back**: `/epcc-demo/accounts`, Command Center, Analytics, Reports → the LinkedIn
  follower count appears. (Per-post LinkedIn engagement is a documented follow-up.)

## 6. Known limitations (see PR #3 / the spec)

- **Community Management API approval** gates real org posting.
- No native scheduling on the Posts API → `scheduledPublishTime` is ignored for LinkedIn.
- No Stories/Reels equivalent → those formats post as a normal feed post.
- `IPost` has no `link` field yet, so the article/link path isn't reachable from the UI
  (the connector supports it — needs an `IPost.link` + Composer field).
- `uploadVideo` assumes a single upload part — very large videos may need multi-part slicing.
- Per-post LinkedIn engagement in analytics is deferred (needs a `listOrgPosts` helper feeding
  `getMetrics`); follower counts are surfaced today.

## Where the code lives

- `src/server/connectors/linkedin.ts` — OAuth, `ensureFreshToken`, `listAdminOrgs`, `publish`,
  `deletePost`, `getMetrics`, `getOrgStats`.
- `src/server/connectors/linkedin.config.ts` — REST version, scopes, base URLs.
- `src/server/env.ts` — `LINKEDIN` config + `assertLinkedInConfigured()`.
- Connect routes: `app/api/connect/[platform]/route.ts` + `.../callback/route.ts` (generic).
- Publisher: `src/modules/EpccDemo/_services/publish.ts`; analytics: `app/api/{overview,metrics,report}/route.ts`.
