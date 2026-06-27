// ─────────────────────────────────────────────────────────────────────────────
// Hashtags to track for content discovery & market intelligence.
//
// WHY this exists: Meta blocks reading competitor Pages you don't manage (needs
// "Page Public Content Access" app review). The Instagram Hashtag Search API is
// the LEGITIMATE alternative — it returns the top & most-recent PUBLIC posts for
// a hashtag, so the Chamber can see what content is performing around the topics
// it cares about (events, sectors, region) without touching competitor pages.
//
// LIMITS (Meta, enforced): one Instagram Business account may query at most
//   **30 unique hashtags per rolling 7-day window**. So keep this list focused;
//   the /api/discover route caches results for 6h to stay well inside the limit.
// The hashtag-media response does NOT include the author's username (Meta hides
// it for privacy) — we surface caption, media, and engagement only.
//
// Edit this list to the hashtags relevant to the Eastern Province Chamber.
// Write them WITHOUT the leading "#". Arabic hashtags are supported.
// ─────────────────────────────────────────────────────────────────────────────
export const HASHTAGS: string[] = [
  'EasternProvince',
  'Dammam',
  'Khobar',
  'SaudiBusiness',
  'Vision2030',
  'الغرفة_الشرقية',
  'المنطقة_الشرقية',
  'ريادة_الأعمال',
];
