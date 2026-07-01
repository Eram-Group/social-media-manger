# EPCC Social Connectors — Status Matrix

_Last updated: 2026-07-02 · branch `feat/tiktok-connector`_

Legend: ✅ done & live · 🔨 built, build-green (needs live API verification) · ⛔ blocked by platform approval · ⬜ not built · — not applicable / platform has no such capability

---

## 1. Capability matrix

| Capability | Facebook | Instagram | LinkedIn | Snapchat | X (Twitter) | TikTok |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Connector code built | ✅ | ✅ | 🔨 | 🔨 | 🔨 | 🔨 |
| OAuth connect | ✅ | ✅ | 🔨 | 🔨 | 🔨 (OAuth2 + PKCE) | 🔨 |
| Token refresh | — (permanent Page token) | — | 🔨 | 🔨 | 🔨 | 🔨 |
| Publish — text | ✅ | — | 🔨 | — | 🔨 | — (needs media) |
| Publish — image | ✅ | ✅ | 🔨 | 🔨 (Story/Saved) | 🔨 (up to 4) | 🔨 (Photo mode) |
| Publish — multi-image | ✅ | ✅ | 🔨 | — | 🔨 (up to 4) | 🔨 (photo carousel) |
| Publish — video | ✅ | ✅ (Reel) | 🔨 | 🔨 (Spotlight) | 🔨 | 🔨 (Direct Post) |
| Publish — story/ephemeral | ✅ | ✅ | — | 🔨 (Story) | — | — |
| Publish — link/article | ✅ | — | 🔨 (no UI field yet) | — | 🔨 (URL in text) | — |
| Delete post | ✅ | ⛔ (IG API can't delete → hide) | 🔨 | 🔨 | 🔨 | ⛔ (no delete API → hide) |
| Read-back — post metrics | ✅ | ✅ | 🔨 (deferred: needs listOrgPosts) | 🔨 | 🔨 (per-tweet public_metrics) | 🔨 (per-video stats) |
| Read-back — followers | ✅ | ✅ | 🔨 | 🔨 | 🔨 | 🔨 |
| Read-back — demographics | ⛔ (Meta removed for FB) | ✅ | ⬜ | ⬜ | ⛔ (X API limit) | ⛔ (creator-portal only) |
| Surfaced in Analytics/Reports | ✅ | ✅ | 🔨 (followers) | 🔨 (followers) | 🔨 (followers) | 🔨 (followers) |
| Shows in Posts list after reload | ✅ (Graph read-back) | ✅ | 🔨 (ledger) | 🔨 (ledger) | 🔨 (ledger) | 🔨 (ledger) |
| Scheduling | ✅ (FB native) | ⬜ (needs our Cron) | — (ignored) | — (ignored) | ⬜ (needs our Cron) | ⬜ (needs our Cron) |
| **Live-verified against real API** | ✅ | ✅ | 🟡 partial (member publish ✅) | ⬜ (no dev app yet) | ⬜ (needs paid tier) | ⬜ (needs audit) |

---

## 2. Go-live gate per platform (the real blocker)

| Platform | What's needed to go live | Status |
|---|---|---|
| Facebook | — | ✅ live |
| Instagram | — | ✅ live |
| LinkedIn (personal profile) | `w_member_social` (Share on LinkedIn product) | ✅ works live (member mode) |
| LinkedIn (Company Page + analytics) | **Community Management API** approval — separate app (only-product rule) + registered legal org + business email + verified Page | ⛔ pending your request |
| Snapchat | **Snap Business account + Public Profile + Marketing-API access approval**; OAuth app in Snap Business Manager | ⛔ needs setup/approval |
| X (Twitter) | Developer account + **paid API tier** (~$200/mo Basic); `tweet.write` | 🔨 built — needs paid tier + live verify |
| TikTok | Developer app + **content-posting audit** (~1–2 wks; posts private until approved) | 🔨 built — needs audit + live verify |

---

## 3. Where each connector lives

| Platform | Code | PR |
|---|---|---|
| Facebook / Instagram | `src/server/connectors/{facebook,instagram}.ts` | (in main) |
| LinkedIn | `src/server/connectors/linkedin.ts` + `linkedin.config.ts` | PR #3 (merged to `main`) |
| Snapchat | `src/server/connectors/snapchat.ts` + `snapchat.config.ts` | PR #4 (on `dev`) |
| X | `src/server/connectors/x.ts` + `x.config.ts` | on `feat/tiktok-connector` |
| TikTok | `src/server/connectors/tiktok.ts` + `tiktok.config.ts` | on `feat/tiktok-connector` |

Shared infra (all connectors): `SocialConnector` interface + `assertConfigured?()` (`types.ts`), connector-owned token refresh (`ensureFreshToken`), the published-posts ledger (`store.ts`), and the generic connect routes (`app/api/connect/[platform]/*`).

---

## 4. Conventions

- **Build-green**: connectors must pass `npm run typecheck` + a clean `npm run build` (`rm -rf .next` first). External-API request/response field names are marked `// VERIFY` and confirmed against the live API later (no unit-test framework in this repo).
- **Never fabricate metrics** — absent data is omitted (empty-state), never zero-filled.
- **Secrets** live in `.env.local` (gitignored); `toPublic()` strips access + refresh tokens before returning accounts to the browser.
