# EPCC Platform — Client Requirements → Implementation Map

How each client requirement maps to the platform: what's **done**, what's **partial**,
and what's **still to build** — grounded in what each social API actually allows (tested
live, not assumed).

Legend: ✅ done · 🟡 partial · 🔧 to build · ⛔ blocked by the platform's API

---

## 1. Unified platform for all EPCC accounts (X, Instagram, LinkedIn, Facebook, Snapchat, TikTok + extensible)

| Platform | Status | Notes |
|----------|--------|-------|
| Facebook | ✅ | Connect, publish (post/photo/video/reel/story), schedule, delete, comments, insights — all real |
| Instagram | ✅ | Connect, publish (post/reel/story), comments, demographics, insights — all real |
| X (Twitter) | 🔧 | Connector not built. **Paid API** (~$0.015/post) |
| LinkedIn | 🔧 | Connector not built. Needs LinkedIn product approval |
| TikTok | 🔧 | Connector not built. Needs content-posting audit (~2 wks) |
| Snapchat | 🔧 | Connector not built. Ads/creative-oriented API |

**Architecture is already extensible** — one `SocialConnector` interface; each new network
is a new implementation. Adding a platform = build its connector + OAuth. FB/IG prove the pattern.

**Effort to add the other 4:** ~3–5 days each (OAuth + publish + read-back), plus each
platform's approval/audit/billing lead time.

---

## 2. Audience info — interests & desires (Weekly/Monthly report)

| Piece | Status | Notes |
|-------|--------|-------|
| Follower demographics (age, gender, country) | ✅ Instagram · ⛔ Facebook | IG gives it (100+ followers); **Meta removed it for FB Pages** |
| Account reach, views, engagement, profile views, clicks | ✅ Instagram · 🟡 Facebook | Full set on IG; FB gives engagement/follows/views (no reach) |
| **Interests** | 🔧 | Not a raw API field anywhere. Derive it: AI analysis of which content themes get the most engagement |
| Weekly/Monthly report export (PDF/email) | 🔧 | Reports screen exists with real aggregates; add period rollups + PDF/email |

**To deliver "interests & desires":** combine real per-post engagement + an **AI pass**
that classifies top content into themes ("SME stories", "Vision 2030", "events"…) and
ranks them. That's the honest, deliverable version of "interests".

---

## 3. Trends & audience opinion on the Chamber's performance (Weekly/Monthly report)

| Piece | Status | Notes |
|-------|--------|-------|
| Real comments (FB + IG), threaded | ✅ | Inbox + per-post comments are live |
| **Sentiment analysis** (positive/neutral/negative) | 🔧 | Run comments/mentions through OpenAI → sentiment + recurring themes |
| Trend tracking over time | 🔧 | Store weekly snapshots in Neon → trend lines |

**This is fully doable** — the comments are real; an AI sentiment pass over them produces
the "opinion on Chamber performance" + "alignment with aspirations" the client wants.
Build: a scheduled job that pulls comments, scores sentiment, and rolls into the report.

---

## 4. Paid content promotion on all platforms (Weekly/Monthly report)

| Piece | Status | Notes |
|-------|--------|-------|
| Promotion planner UI + AI campaign plan | ✅ | Promotion screen builds objective/audience/budget plans |
| **Actually launching paid ads** | 🔧 / 💰 | Requires each platform's **Ads API** (Meta Marketing API, etc.) — separate, heavier integrations with ad-account access + spend |

**Reality:** organic publishing (done) and **paid ads** are different APIs. Real paid
promotion = Meta Marketing API (FB/IG), and equivalents per platform, each needing an ad
account, billing, and (often) business verification. This is the **largest** remaining
build. Phase it: start with **Meta paid boost** (same Business we already use), add others later.

---

## 5. Posting schedule + delete content when errors found

| Piece | Status | Notes |
|-------|--------|-------|
| Schedule posts (real, on the platform) | ✅ Facebook · 🟡 Instagram | FB native scheduling; IG has no native schedule API → use our own scheduler (Vercel Cron + Neon) |
| Calendar view | ✅ | Real scheduled/published posts |
| Delete content | ✅ Facebook · ⛔ Instagram | FB deletes for real; **IG has no delete API** → we "remove from dashboard" + link to delete in-app |

**Note for the client:** "delete from all platforms" is constrained — **Instagram does not
allow deletion via any API** (Meta restriction, affects every tool). FB/LinkedIn/X do.

---

## 6. AI services integrated, fit to the work environment, new ideas per stage (Weekly/Monthly report)

| Piece | Status | Notes |
|-------|--------|-------|
| AI assistant (chat) | ✅ | Plan content, write captions, analyze |
| AI content generation (caption, image, video, hashtags) | ✅ | OpenAI gpt-4o-mini, gpt-image-1, Sora |
| AI insights on the dashboard | ✅ | Actionable insight strips |
| AI idea suggestions per stage | 🟡 | Exists; can be tuned to "per campaign stage" |
| Move AI key server-side | 🔧 | Currently client-side (`NEXT_PUBLIC_`); should proxy via backend |

**Strong here already.** The main hardening: move the OpenAI key behind a backend route,
and feed the AI **real** performance data so suggestions are grounded in actual results.

---

## 7. 24/7 designated contact for malfunctions/emergencies

| Piece | Status | Notes |
|-------|--------|-------|
| Support screen + hotline + AI support chat | ✅ | In-app support page |
| Real on-call process / escalation | 🔧 (operational) | This is a **service/SLA** commitment, not just code — define the on-call contact + monitoring/alerting |

**Mostly operational:** add uptime monitoring + alerting (e.g. health checks → notify the
on-call contact) so "platform operational 24/7" is backed by real monitoring.

---

## Summary — where we stand

**Built & real today:** unified FB + IG (publish all formats, schedule, delete, comments,
insights), real audience metrics + IG demographics, Inbox with replies, AI suite, reports
with real aggregates, accounts management, support page.

**Biggest remaining work, in priority order:**
1. **Reports** — weekly/monthly rollups + **AI sentiment** over real comments + PDF/email export (covers reqs 2, 3, 6-report).
2. **Remaining connectors** — LinkedIn, X, TikTok, Snapchat (req 1). Each: own OAuth + approval/billing.
3. **Paid promotion** — real Ads APIs, starting with Meta Marketing API (req 4). Largest.
4. **IG scheduler** — our own Cron-based scheduler since IG has no native schedule (req 5).
5. **Hardening** — OpenAI key server-side; uptime monitoring for the 24/7 SLA (reqs 6, 7).

**Honest API limits to set client expectations:**
- Facebook Page **demographics & reach** were removed by Meta — only Instagram has them.
- **Instagram posts can't be deleted** via any API.
- **X API is paid**; **TikTok needs an audit**; **paid ads** are separate, heavier APIs.
These constraints apply to *every* social tool, not just ours.

---

## 🎯 CURRENT SCOPE: Meta only (Facebook + Instagram)

We're delivering the **full requirement set on Facebook + Instagram first**. The other
platforms (X, LinkedIn, TikTok, Snapchat) stay "Coming soon" and slot into the same
connector pattern later. Here's how all 7 requirements are satisfied within Meta:

| # | Requirement | Meta scope — how it's met | Status |
|---|-------------|---------------------------|--------|
| 1 | Unified platform | FB + IG fully integrated; other platforms show "Coming soon" | ✅ |
| 2 | Audience interests & desires | IG demographics (age/gender/country) + IG/FB reach/engagement + AI theme ranking of top content | 🟡 demographics ✅, interests via AI 🔧 |
| 3 | Trends & opinion on performance | AI sentiment over **real FB + IG comments**, weekly snapshots for trends | 🔧 (comments are real; add AI sentiment + rollup) |
| 4 | Paid promotion | **Meta Marketing API** (boost FB/IG posts) — same Business we already use | 🔧 (Meta only) |
| 5 | Schedule + delete | FB native schedule + our Cron for IG; FB delete real, IG = remove-from-dashboard | ✅ (with IG-delete caveat) |
| 6 | AI integrated + ideas per stage | AI suite live; ground it in real FB/IG metrics; move key server-side | ✅ / 🔧 hardening |
| 7 | 24/7 contact | Support page + hotline; add uptime monitoring/alerting | ✅ / 🔧 monitoring |

### Meta-only build plan (recommended order)
1. **Reports v2** — weekly/monthly rollups of real FB+IG metrics + **AI sentiment** on real
   comments + PDF/email export. (Covers reqs 2, 3, and the "report" part of 6.)
2. **Meta paid promotion** — Meta Marketing API to boost FB/IG posts with budget/audience.
   (Req 4, Meta-scoped.)
3. **Instagram scheduler** — Vercel Cron + Neon to publish IG posts at the scheduled time
   (IG has no native scheduling). (Completes req 5 for IG.)
4. **Hardening** — OpenAI key server-side; uptime monitoring → on-call alert. (Reqs 6, 7.)

Everything above uses the **same Meta app + Business** already connected — no new platform
approvals needed (except enabling the Marketing API / ads access for paid promotion).

### What's already DONE for the Meta scope
Connect (OAuth) · publish all formats (post/photo/video/reel/story) to FB + IG · real
scheduling (FB) · delete (FB) / remove-from-dashboard (IG) · real comments + threaded
replies + hide/delete · real post insights · real audience metrics + IG demographics ·
AI assistant + content/image/video generation · accounts management · Neon persistence ·
Vercel Blob media hosting · deployed to production.
