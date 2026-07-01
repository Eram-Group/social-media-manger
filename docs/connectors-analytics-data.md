# Analytics Data by Platform — What You Can Actually Pull

_Updated 2026-07-01. Per platform: the real metric fields each API exposes for building analytics — account-level, post-level, and audience/demographics — plus what our connector currently surfaces and what's blocked._

Key: ✅ available & wired · 🟡 available, not yet wired · ⛔ not available (platform limit) · 🔒 needs approval/scope

---

## Facebook (Meta Graph) — ✅ live

**Account / Page level** (`/{page}/insights`, period=day):
| Metric | Field | Status |
|---|---|---|
| New follows / unfollows (daily) | `page_daily_follows_unique`, `page_daily_unfollows_unique` | ✅ |
| Post engagements | `page_post_engagements` | ✅ |
| Page views | `page_views_total` | ✅ |
| Video views | `page_video_views` | ✅ |
| Video watch time | `page_video_view_time` | ✅ |
| Total actions | `page_total_actions` | ✅ |
| Reactions total | `page_actions_post_reactions_total` | ✅ |

**Post level** (`/{page}/posts` + `/{post}/insights`): likes, comments, shares, reactions **by type** (like/love/wow/haha/sad/angry), fan reach, content clicks, video views. ✅

**Demographics:** age / gender / country — ⛔ **Meta removed these for FB Pages** (no longer returned).

---

## Instagram (IG Graph) — ✅ live

**Account level** (`/{ig-user}/insights`, `metric_type=total_value`):
`reach`, `views`, `accounts_engaged`, `total_interactions`, `likes`, `comments`, `shares`, `saves`, `profile_views`, `website_clicks`, `profile_links_taps` — ✅

**Post / media level:** reach, likes, comments, shares, saves, video views. ✅

**Demographics** (`/{ig-user}/insights` audience, needs **100+ followers**):
follower **age ranges**, **gender**, **top countries / cities** — ✅

---

## LinkedIn (Community Management API) — 🔒 needs Company-Page approval

_All org analytics require `r_organization_social` / `rw_organization_admin` — i.e. Community Management API approval. Personal profiles get **nothing** (`r_member_social` closed)._

**Follower statistics** (`/organizationalEntityFollowerStatistics`):
- Total follower count (`networkSizes`) — 🟡 (our `getOrgStats`)
- Follower breakdown by **seniority, function, industry, company size, region, country** — 🟡 (rich demographics — richer than IG)

**Share / post statistics** (`/organizationalEntityShareStatistics`, `/socialActions/{urn}`):
- Impressions, clicks, likes, comments, shares, **engagement rate** — 🟡
- Per-post: `likesSummary.totalLikes`, `commentsSummary.totalComments` — 🟡

**Page statistics** (`/organizationPageStatistics`): page views, unique visitors, clicks by section (careers, about, etc.) — 🟡

> LinkedIn has the **richest demographics** of any platform (industry/seniority/function) — but only after Community Management API approval.

---

## Snapchat (Public Profile API) — 🟡 built, needs Marketing-API approval

**Profile level:** subscriber count (`getProfileStats`) — 🟡; audience insights (**age, gender, region**) for profiles with enough followers — 🟡.

**Content level** (`/content/{id}/stats`): **views**, **impressions**, **screenshots**, **swipes/link taps**, **shares** — 🟡 (our `getMetrics` reads these).

**Per type:** Story (views, screenshots, completion), Spotlight (views, favorites, shares), Saved Story (cumulative views). 🟡

---

## X / Twitter (API v2) — ⚪ to build (paid)

**Tweet level** (`GET /2/tweets/:id?tweet.fields=public_metrics`):
- Public: `like_count`, `retweet_count`, `reply_count`, `quote_count`, `bookmark_count`, `impression_count` — planned
- Organic (your own tweets, user context — `non_public_metrics`/`organic_metrics`): impressions, **URL link clicks**, **user profile clicks**, video views — planned 🔒 (needs user-context + paid tier)

**Account level** (`GET /2/users/me?user.fields=public_metrics`):
`followers_count`, `following_count`, `tweet_count`, `listed_count` — planned

**Demographics:** ⛔ X API does not expose follower demographics.

---

## TikTok (Content Posting / Display API) — ⚪ to build (audit)

**Video level** (Video Query API): `view_count`, `like_count`, `comment_count`, `share_count`, and (with insights scope) reach, average watch time — planned 🔒 (scope + audit).

**Account level** (`/user/info`): `follower_count`, `following_count`, `likes_count`, `video_count` — planned.

**Demographics:** ⛔ not available via the standard content APIs (audience insights are creator-portal only).

---

## Cross-platform summary — what analytics are possible where

| Data type | FB | IG | LinkedIn | Snapchat | X | TikTok |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Followers / subscribers | ✅ | ✅ | 🔒 | 🟡 | ⚪ | ⚪ |
| Follower growth over time | ✅ | ✅ | 🔒 | 🟡 | ⚪ | ⚪ |
| Post engagement (likes/comments/shares) | ✅ | ✅ | 🔒 | 🟡 | ⚪ | ⚪ |
| Reach / impressions | ⛔ page | ✅ | 🔒 | 🟡 | ⚪(paid) | ⚪ |
| Reactions by type | ✅ | ⛔ | 🔒 | ⛔ | ⛔ | ⛔ |
| Video views / watch time | ✅ | ✅ | 🔒 | 🟡 | ⚪ | ⚪ |
| Clicks (link/profile) | ✅ | ✅ | 🔒 | 🟡 | ⚪(paid) | ⚪ |
| Audience demographics (age/gender) | ⛔ | ✅ | 🔒 (richest) | 🟡 | ⛔ | ⛔ |
| Best-time / posting insights | ✅ (derived) | ✅ (derived) | 🔒 | 🟡 | ⚪ | ⚪ |

**Takeaways for the analytics UI:**
- **Deepest analytics today:** Instagram (metrics + demographics) and Facebook (metrics, no demographics).
- **Richest *potential*:** LinkedIn (industry/seniority/function demographics) — once approved.
- **X & TikTok:** solid post + follower metrics, but **no demographics** and X's richer organic metrics need the paid tier.
- Everything absent is shown as an **empty-state** in the UI (we never fabricate numbers).
