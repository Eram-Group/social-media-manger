# Getting REAL competitor / public-page data from Meta

**The honest summary:** the only legitimate way to read Facebook Pages you don't
manage (follower counts **and** their public posts) is **Meta App Review** for
**Page Public Content Access (PPCA)**, which also requires **Business
Verification**. There is no API trick, no token, and **no legal scraping** path.
Once approved, this app's `/api/competitors` route lights up automatically — real
competitor rows (followers + post engagement) appear with no further code.

Verified against Meta's docs, June 2026.

---

## Why not the alternatives

| Approach | Verdict |
|---|---|
| **Web scraping FB/IG** | ❌ Violates the [Meta Platform Terms](https://developers.facebook.com/terms/). Meta bans the **app and the Pages** involved — including the Chamber's own real pages. Do not do this. |
| **Page Public Metadata Access** | ⚠️ Real, but **superseded by PPCA**. "If your App Review submission includes PPCA, or your app has already been approved for PPCA, you cannot request this permission." Still needs App Review + Business Verification. |
| **Page Public Content Access (PPCA)** | ✅ **The path to request.** Unlocks follower/like counts, public "about" info, the Pages Search API, **and competitors' public posts/engagement**. Needs App Review + Business Verification. |
| **Meta Content Library** | ❌ Restricted to academic/non-profit researchers (reviewed by CASD). A Chamber of Commerce is **not eligible** for commercial benchmarking. |

---

## What PPCA unlocks (and what the app already does with it)

- `GET /{page-id-or-username}?fields=followers_count,fan_count,category,...` — real
  follower & category data for any public Page. → already wired in
  `src/server/connectors/competitors.ts` (`fetchCompetitorPage`).
- `GET /{page-id}/posts` for pages you don't manage — their recent posts +
  likes/comments/shares. → already wired (`fetchPostsAnalysis` / `enrichWithPosts`),
  so the Competitors screen shows real competitor engagement automatically.

The peer chambers are pre-listed in `src/server/connectors/competitors.config.ts`
(Riyadh, Jeddah, Dammam). Until approval they show a "blocked" notice; after
approval they become **LIVE** rows.

---

## Prerequisites (do these first)

1. **Business Verification** — App Dashboard → the app must belong to a verified
   **Meta Business** (Business Manager → Security Center → complete Business
   Verification with the Chamber's legal documents: CR, address, etc.).
2. **App essentials** — Settings → Basic: Privacy Policy URL (required), App icon
   (1024×1024), category, and a Data Deletion URL/Instructions.
3. **A working demo** — reviewers must see the feature in use. Our `/api/competitors`
   route + Competitors screen already call the public-page endpoints, so it's ready
   to screencast.

---

## Submit the request

1. App Dashboard → **App Review → Permissions and Features**.
2. Search **"Page Public Content Access"** → **Request advanced access**.
3. Paste this justification (edit names as needed):

   > *The Eastern Province Chamber of Commerce operates an internal social-media
   > dashboard used only by Chamber staff. We use Page Public Content Access to read
   > the public follower counts and public posts of a small, fixed list of peer
   > Saudi chambers of commerce (Riyadh, Jeddah, Dammam) in order to benchmark our
   > own Page's growth and content performance within the same category. Data is read
   > server-side, cached, shown only to staff, and never stored long-term or
   > redistributed.*

4. **Screencast:** record the Competitors screen and `/api/competitors` returning
   the peer pages. **Test steps:** tell the reviewer how to reach the screen.
5. Submit. Review typically takes **a few days to a few weeks**; Meta may request changes.

---

## After approval — zero code changes

Add or adjust peer pages in `competitors.config.ts` (or pass them to the script):

```bash
node scripts/fetch-meta.mjs RiyadhChamber jeddahchamber dammamchamber
```

`/api/competitors` then returns real follower counts **and** post-engagement for
each peer; the **Competitors** screen ranks them next to the Chamber's own page,
flagged **LIVE**.

---

## Until approval — what's real TODAY (no review)

- **Your own pages:** full real data (followers, growth, engagement, posts) — live now.
- **Content Discovery** (`/epcc-demo/discover`): real public posts around your
  hashtags via the Instagram Hashtag Search API — the one real "what's happening in
  our space" signal that needs no extra review.
- **Competitive Benchmark:** peer numbers entered by hand are **snapshotted over
  time**, so you still get a real growth trend and engagement-rate comparison while
  the PPCA review is pending.
