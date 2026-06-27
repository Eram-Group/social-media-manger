# PPCA App Review — submission runbook

Goal: get **Page Public Content Access (PPCA)** approved so the app reads real
competitor follower counts + public posts. This is the only legitimate path; it
needs **Business Verification + App Review**. Follow the steps in order.

`{APP_URL}` below = your deployed app URL (e.g. `https://epcc-app.vercel.app`).
The Privacy and Data-Deletion URLs **must be publicly reachable**, so deploy first.

---

## ✅ Done in code (no action needed)

- **Privacy Policy page** → `{APP_URL}/privacy`
- **Data Deletion page** → `{APP_URL}/data-deletion`
- The feature reviewers must see is live: **Competitors** screen + `/api/competitors`
  already call the public-page endpoints (`fetchCompetitorPage` + `enrichWithPosts`).
- Peer pages pre-listed in `competitors.config.ts` (Riyadh, Jeddah, Dammam).

## 🔲 You must do (Meta dashboard + Chamber documents)

These cannot be automated — they need your Meta login and the Chamber's legal docs.

### Step 1 — Deploy, so the URLs are public
Deploy the app (Vercel). Confirm `{APP_URL}/privacy` and `{APP_URL}/data-deletion`
load in a browser.

### Step 2 — App Settings → Basic (App Dashboard)
Fill in and **Save**:
- **Privacy Policy URL:** `{APP_URL}/privacy`
- **User Data Deletion:** choose "Data Deletion Instructions URL" → `{APP_URL}/data-deletion`
- **App icon:** 1024×1024 PNG (Chamber logo)
- **Category:** Business and Pages
- **Business Use:** "Support my own business"

### Step 3 — Business Verification
App Dashboard → **Business Verification** (or Business Manager → Security Center).
Submit the Chamber's legal documents (Commercial Registration, official address,
phone). PPCA cannot be granted without this. Allow a few days.

### Step 4 — Request the feature
App Dashboard → **App Review → Permissions and Features** → search
**"Page Public Content Access"** → **Request advanced access** → **Continue submission**.

**Paste this into "How will you use this feature?":**

> The Eastern Province Chamber of Commerce operates an internal social-media
> dashboard used only by Chamber staff. We use Page Public Content Access to read
> the public follower counts and public posts of a small, fixed list of peer Saudi
> chambers of commerce (Riyadh, Jeddah, Dammam) in order to benchmark our own Page's
> growth and content performance within the same category. Data is read server-side,
> cached, shown only to authorized staff, and is never stored long-term or
> redistributed. We access this data only through the official Meta Graph API and do
> not scrape any Meta property.

**Test instructions for the reviewer:**

> 1. Open {APP_URL}/epcc-demo/competitors
> 2. The "Competitive Benchmark" screen lists peer chamber Pages by category.
> 3. The app calls GET /{page-id}?fields=followers_count,category and
>    GET /{page-id}/posts server-side for each peer Page; with this feature granted,
>    their real follower counts and post engagement display as "LIVE" rows.

### Step 5 — Screencast (required)
Record a 30–60s screen capture showing:
1. Opening `{APP_URL}/epcc-demo/competitors`.
2. The peer pages and the benchmark UI.
3. (If you have a Page token) the network/server call to `/{page}/posts` returning data.
Upload it in the submission.

### Step 6 — Submit
Submit and wait. Review is typically a few days to a few weeks; Meta may ask for
clarification — respond with the same use-case wording.

---

## After approval — nothing to code
Real competitor rows appear automatically (flagged **LIVE**) on the Competitors
screen, and `node scripts/fetch-meta.mjs RiyadhChamber jeddahchamber dammamchamber`
returns their real data. Add more peers in `competitors.config.ts`.

## Common rejection reasons (avoid them)
- Privacy/Deletion URL not reachable → deploy first (Step 1).
- Business Verification incomplete → do Step 3 before submitting.
- Vague use-case → use the exact wording above (fixed peer list, internal, no resale).
- Reviewer can't see the feature → make sure the Competitors screen is reachable at the test URL.
