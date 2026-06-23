# Social Connectors — Setup & Testing (Meta first)

This is the real connector layer (Phase 0/1 of [GO-LIVE-PLAN](./GO-LIVE-PLAN.md)).
One `SocialConnector` interface, implemented per platform. Facebook + Instagram are live.

## Architecture
```
app/api/connect/[platform]            → start OAuth (redirect to Meta)
app/api/connect/[platform]/callback   → exchange code → Page / IG accounts (+ tokens)
app/api/posts/publish                 → publish via the platform's connector

src/server/env.ts                     → server-only config (App ID/Secret, redirect URIs)
src/server/connectors/
  types.ts        → SocialConnector interface + ConnectedAccount / PublishInput
  meta.ts         → shared Graph API helpers + OAuth token chain
  facebook.ts     → Facebook Page connector (feed / photos)
  instagram.ts    → Instagram connector (container → publish)
  registry.ts     → platform id → connector
```

## What you need to provide (env)
In `.env` (or `.env.local`):
```
APP_BASE_URL=http://localhost:3000
META_APP_ID=<your app id>
META_APP_SECRET=<your app secret>
```

## One-time Meta app config
1. **developers.facebook.com → your app → Add product → Facebook Login.**
2. Facebook Login → **Settings → Valid OAuth Redirect URIs**, add:
   - `http://localhost:3000/api/connect/facebook/callback`
   - `http://localhost:3000/api/connect/instagram/callback`
   - (and your production equivalents later)
3. Add the **Pages API** product. For Instagram, link an **IG Business/Creator
   account** to your Facebook Page.
4. Keep the app in **Development Mode** and make sure you're an **admin/tester** —
   that lets you publish to your own Page without App Review.

## Test the first post (Facebook)
1. `npm run dev`
2. Visit `http://localhost:3000/api/connect/facebook` → authorize → the callback
   returns JSON with your Page(s): `accountId` + `accessToken`.
3. Publish:
   ```bash
   curl -X POST http://localhost:3000/api/posts/publish \
     -H 'Content-Type: application/json' \
     -d '{"platform":"facebook","accountId":"<PAGE_ID>","accessToken":"<PAGE_TOKEN>","message":"Hello from the Chamber 🚀"}'
   ```
4. Check the Page — the post is live. 🎉 (Add `"imageUrl":"https://…/pic.jpg"` for a photo post.)

For Instagram, use `/api/connect/instagram` and include an `imageUrl` (IG requires media).

## Security note (dev vs prod)
The callback currently returns access tokens as JSON **for dev testing only**. Once
the database is added, tokens will be stored **encrypted server-side** and never
returned to the client; the publish endpoint will look them up by a stored account id.
