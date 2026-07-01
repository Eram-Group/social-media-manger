# EPCC Social Connectors — Status Matrix

_Last updated: 2026-07-01 · branch `dev`_

Legend: ✅ done & live · 🔨 built, build-green (needs live API verification) · ⛔ blocked by platform approval · ⬜ not built · — not applicable / platform has no such capability

---

## 1. Capability matrix

| Capability | Facebook | Instagram | LinkedIn | Snapchat | X (Twitter) | TikTok |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Connector code built | ✅ | ✅ | 🔨 | 🔨 | ⬜ | ⬜ |
| OAuth connect | ✅ | ✅ | 🔨 | 🔨 | ⬜ | ⬜ |
| Token refresh | — (permanent Page token) | — | 🔨 | 🔨 | ⬜ | ⬜ |
| Publish — text | ✅ | — | 🔨 | — | ⬜ | ⬜ |
| Publish — image | ✅ | ✅ | 🔨 | 🔨 (Story/Saved) | ⬜ | ⬜ |
| Publish — multi-image | ✅ | ✅ | 🔨 | — | ⬜ | ⬜ |
| Publish — video | ✅ | ✅ (Reel) | 🔨 | 🔨 (Spotlight) | ⬜ | ⬜ |
| Publish — story/ephemeral | ✅ | ✅ | — | 🔨 (Story) | — | — |
| Publish — link/article | ✅ | — | 🔨 (no UI field yet) | — | ⬜ | ⬜ |
| Delete post | ✅ | ⛔ (IG API can't delete → hide) | 🔨 | 🔨 | ⬜ | ⬜ |
| Read-back — post metrics | ✅ | ✅ | 🔨 (deferred: needs listOrgPosts) | 🔨 | ⬜ | ⬜ |
| Read-back — followers | ✅ | ✅ | 🔨 | 🔨 | ⬜ | ⬜ |
| Read-back — demographics | ⛔ (Meta removed for FB) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Surfaced in Analytics/Reports | ✅ | ✅ | 🔨 (followers) | 🔨 (followers) | ⬜ | ⬜ |
| Shows in Posts list after reload | ✅ (Graph read-back) | ✅ | 🔨 (ledger) | 🔨 (ledger) | ⬜ | ⬜ |
| Scheduling | ✅ (FB native) | ⬜ (needs our Cron) | — (ignored) | — (ignored) | ⬜ | ⬜ |
| **Live-verified against real API** | ✅ | ✅ | 🟡 partial (member publish ✅) | ⬜ (no dev app yet) | ⬜ | ⬜ |

---

## 2. Go-live gate per platform (the real blocker)

| Platform | What's needed to go live | Status |
|---|---|---|
| Facebook | — | ✅ live |
| Instagram | — | ✅ live |
| LinkedIn (personal profile) | `w_member_social` (Share on LinkedIn product) | ✅ works live (member mode) |
| LinkedIn (Company Page + analytics) | **Community Management API** approval — separate app (only-product rule) + registered legal org + business email + verified Page | ⛔ pending your request |
| Snapchat | **Snap Business account + Public Profile + Marketing-API access approval**; OAuth app in Snap Business Manager | ⛔ needs setup/approval |
| X (Twitter) | Developer account + **paid API tier** (~$0.015/post); `tweet.write` | ⬜ to build |
| TikTok | Developer app + **content-posting audit** (~1–2 wks; posts private until approved) | ⬜ to build |

---

## 3. Where each connector lives

| Platform | Code | PR |
|---|---|---|
| Facebook / Instagram | `src/server/connectors/{facebook,instagram}.ts` | (in main) |
| LinkedIn | `src/server/connectors/linkedin.ts` + `linkedin.config.ts` | PR #3 (merged to `main`) |
| Snapchat | `src/server/connectors/snapchat.ts` + `snapchat.config.ts` | PR #4 (on `dev`) |
| X | `src/server/connectors/x.ts` (planned) | — |
| TikTok | `src/server/connectors/tiktok.ts` (planned) | — |

Shared infra (all connectors): `SocialConnector` interface + `assertConfigured?()` (`types.ts`), connector-owned token refresh (`ensureFreshToken`), the published-posts ledger (`store.ts`), and the generic connect routes (`app/api/connect/[platform]/*`).

---

## 4. Conventions

- **Build-green**: connectors must pass `npm run typecheck` + a clean `npm run build` (`rm -rf .next` first). External-API request/response field names are marked `// VERIFY` and confirmed against the live API later (no unit-test framework in this repo).
- **Never fabricate metrics** — absent data is omitted (empty-state), never zero-filled.
- **Secrets** live in `.env.local` (gitignored); `toPublic()` strips access + refresh tokens before returning accounts to the browser.
