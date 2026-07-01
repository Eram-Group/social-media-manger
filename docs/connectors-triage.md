# Connectors — Triage (What Works / What Doesn't / What's Needed)

_Updated 2026-07-01. Honest, live-verified status — not "code exists," but "does it actually work right now."_

Status key: 🟢 **working live** · 🟡 **code built, not verified live** · 🔴 **not working** · ⚪ **not built**

---

## TL;DR — one line per platform

| Platform | Overall | One-line reality |
|---|:--:|---|
| **Facebook** | 🟢 | Fully working — connect, publish, delete, analytics. |
| **Instagram** | 🟢 | Fully working (except delete — IG API forbids it; we hide instead). |
| **LinkedIn** | 🟡 | **Personal-profile publish works live.** Company Page + analytics blocked (needs LinkedIn approval). |
| **Snapchat** | 🟡 | Code done; **nothing live yet** — no Snap Business app/credentials connected. |
| **X (Twitter)** | ⚪ | Not built. Design drafted. |
| **TikTok** | ⚪ | Not built. |

---

## Facebook — 🟢 working
- ✅ Working: connect, publish (text/image/video/story), schedule, delete, comments, post + page analytics.
- 🔴 Not working: follower **demographics** — Meta removed this for FB Pages (platform limit, not fixable).
- 🔧 Needed: nothing.

## Instagram — 🟢 working
- ✅ Working: connect, publish (image/video/reel/story), comments, demographics, insights.
- 🔴 Not working: **delete** — IG API has no delete; we "remove from dashboard" instead (platform limit).
- 🔧 Needed: nothing.

## LinkedIn — 🟡 partial
- ✅ Working live: connect (personal profile), **publish to personal profile** (`w_member_social`), delete, post stays in list (ledger).
- 🔴 Not working: **post to Company Page**, **followers/analytics**, reading existing posts.
- 🔧 Needed to fix:
  1. A **new** LinkedIn app with **only** the **Community Management API** product (LinkedIn rule).
  2. Submitted with the **Chamber's legal org + business email + verified Company Page**.
  3. **LinkedIn approves it** (review, days).
  4. Then: put that app's Client ID/Secret in `.env.local`, unset `LINKEDIN_IDENTITY_ONLY`, reconnect → Company Page + analytics work (code ready).
- ⛔ Never possible: analytics/read-back for **personal** posts (`r_member_social` is closed by LinkedIn).

## Snapchat — 🟡 built, not live
- ✅ Done: full connector code (connect, publish Stories/Saved/Spotlight, delete, metrics), in PR #4 / on `dev`.
- 🔴 Not working: everything live — **no Snap credentials connected yet** (error: "Snapchat is not configured").
- 🔧 Needed to fix:
  1. **Snap Business account** at business.snapchat.com (be Organization Admin).
  2. A **Public Profile** (created in the Snapchat phone app).
  3. **OAuth App** in Snap Business Manager → **Business Details → OAuth Apps** → get **Client ID + Secret**; redirect URI `http://localhost:3000/api/connect/snapchat/callback`.
  4. **Marketing/Public-Profile API access approval** from Snap.
  5. Put Client ID/Secret in `.env.local` → Connect → live testing (I fix any `// VERIFY` field mismatches).

## X (Twitter) — ⚪ not built
- Status: design drafted (OAuth2 **PKCE**, publish/delete/read-back). Not implemented.
- 🔧 Needed to build: approve the design → spec → plan → build (build-green).
- ⛔ Go-live gate: X API v2 is **paid** — posting needs the **Basic tier (~$200/mo)**.

## TikTok — ⚪ not built
- Status: not started.
- 🔧 Needed to build: spec → plan → build.
- ⛔ Go-live gate: **content-posting audit** by TikTok (~1–2 wks); posts are private until approved.

---

## The pattern (why "built" ≠ "working")
Every connector's **code** can be finished and reviewed (build-green), but going **live** always needs the **platform's own access approval** + real credentials:

| | Code | Credentials | Platform approval | Live |
|---|:--:|:--:|:--:|:--:|
| Facebook / Instagram | ✅ | ✅ | ✅ (done) | 🟢 |
| LinkedIn (personal) | ✅ | ✅ | ✅ (Share product) | 🟢 |
| LinkedIn (Company Page) | ✅ | ⬜ new app | ⛔ Community Mgmt API | 🔴 |
| Snapchat | ✅ | ⬜ | ⛔ Marketing API | 🔴 |
| X | ⚪ | ⬜ | ⛔ paid tier | ⚪ |
| TikTok | ⚪ | ⬜ | ⛔ audit | ⚪ |

**Bottom line:** the code side is on track; the blockers that remain are **platform approvals + credentials**, which are business/account steps only you (or the Chamber) can complete.
