# EPCC Demo — UX Recommendations (competitive research)

Grounded in how **Hootsuite, Buffer, Sprout Social, Later, Loomly, Planable, Metricool, Agorapulse, Publer** work (2024–2026). ✅ = already in the demo, ◻️ = recommended next.

## Composer
- ✅ **Live per-network previews** (swipe carousel, faithful per platform).
- ✅ **Per-network character counters** (X 280, IG 2200, etc. — amber/red as you approach/exceed).
- ✅ **Customize-per-network** — full per-platform fields (caption + native options: X thread/reply, IG first-comment/location/collab, LinkedIn audience/document, TikTok sound/duet/stitch, etc.).
- ✅ **Stepped composer wizard** (Setup → Content → Customize → Schedule) so each step has fewer fields.
- ✅ **Content format**: Post / Reel / Story / Video, with **image & video upload** and format-aware previews (vertical for reel/story; graceful fallback where unsupported).
- ✅ **Design-system date & time pickers** (calendar popover + time select).
- ✅ **AI**: generate post, image, tags & SEO.
- ✅ **First-comment field** (auto-posts as comment #1).
- ✅ **UTM builder + branded short-link** (`chamber.co/ep-…?utm_…`).
- ✅ **Best-time-to-post chips** when choosing a time (from the day×hour heatmap).

## Calendar
- ✅ Week view, color-coded by type, post-details drawer, reflects CRUD live.
- ◻️ **Drag-and-drop reschedule** (top-requested gesture; Sprout pattern).
- ◻️ **Month + Queue views**; per-day counts and empty-day "gap" highlighting.
- ◻️ **Color-by-campaign** legend.

## Posts list & management
- ✅ **List / Table / Grid** view toggle.
- ✅ **Filters** (status with counts + platform).
- ✅ **CRUD** (create/edit/delete; published = delete-only) + **Promote** action → Paid Promotion.
- ✅ **Bulk-select + contextual action toolbar** (select all, bulk schedule/delete) on list & table.
- ◻️ **Status workflow**: Draft → Pending approval → Scheduled → Published → Failed.
- ◻️ **Search** box.
- ◻️ **Media library** (reusable Chamber assets) with grid/list + labels.

## Analytics & reporting
- ✅ **Per-post analytics**: short peek sheet + full analytics page (reach-over-time, engagement mix, per-platform, top comments).
- ✅ **Reports** with per-platform breakdown + export.
- ◻️ **Period-over-period comparison** (this 30d vs last, ▲/▼) across dashboards.
- ✅ **Best-time heatmap** (day×hour) on Audience — shares the dataset with the composer's time chips.

## Collaboration / approvals (not yet in demo)
- ◻️ **Inline comments** in the post drawer (Planable's in-context feedback).
- ◻️ **Multi-step approval bar** (Staff → Board) with one-click Approve / Request changes — fits Chamber governance.

## Dashboard / inbox / onboarding
- ✅ Command Center with KPIs, trends, "this week" strip, AI insight.
- ◻️ **Unified inbox** (comments/DMs/mentions) with assign + saved replies (the "engagement" half).
- ◻️ **Friendly empty states + "Load sample data"** button — makes screens demo-ready.
- ✅ **Support chat** (24/7, AI agent).

## Top remaining quick wins (build next)
1. Period-over-period comparison on dashboards (this 30d vs last, ▲/▼).
2. Approvals: inline comments + multi-step (Staff → Board) approval bar.
3. Media library (reusable Chamber assets).
4. Color-by-campaign calendar legend + empty-day "gap" highlighting.

_Recently shipped: **stepped composer wizard**, **per-platform custom fields**, **Post/Reel/Story/Video formats** with **image & AI image (gpt-image-1) + AI video (Sora) + upload**, **DS date/time pickers**, **drag-and-drop calendar + Week/Month/Queue**, **unified Inbox** (assign + saved replies), bulk-select toolbar, search, empty states + load-sample, best-time heatmap + composer chips, first-comment, UTM/short-link._

> Reuse tip (from research): one fixture of ~20 posts (network, campaign color, status, time, mock metrics) + one day×hour heatmap powers the calendar, posts list, analytics, comparison cards and best-time chips. The shared `posts-store` already centralises the posts half of this.
