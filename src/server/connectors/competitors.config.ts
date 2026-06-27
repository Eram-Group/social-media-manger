// ─────────────────────────────────────────────────────────────────────────────
// Competitor "Pages to Watch" list.
//
// IMPORTANT — there is NO Meta API to auto-discover Pages by category. Meta
// removed page search after 2018. So competitors must be listed here by hand:
// put each competitor Facebook Page's ID or @username/vanity slug below.
//
// How to find a Page's ID:
//   • Open the Page → About → "Page transparency" → shows the Page ID, OR
//   • Graph API Explorer:  GET /{username}?fields=id,name,category
//
// Reading data about Pages you do NOT manage requires the app to have
// "Page Public Content Access" (PPCA) approved by Meta. Without it the Graph
// API returns an error per page — the connector surfaces that clearly instead
// of failing. Your OWN pages always work.
// ─────────────────────────────────────────────────────────────────────────────

export interface CompetitorRef {
  /** Page numeric ID or @username / vanity slug (e.g. "RiyadhChamber"). */
  ref: string;
  /** Optional friendly label for the UI; falls back to the Page's real name. */
  label?: string;
}

export const COMPETITORS: CompetitorRef[] = [
  // Peer Saudi chambers (verified to resolve to real Facebook Pages). They return
  // a "Page Public Content Access" error until App Review is approved — then real
  // follower counts AND recent-post engagement flow in automatically.
  { ref: 'RiyadhChamber', label: 'Riyadh Chamber' },
  { ref: 'jeddahchamber', label: 'Jeddah Chamber' },
  { ref: 'dammamchamber', label: 'Dammam Chamber' },
  // Add more by @username or numeric Page ID. Find the ID via:
  //   Page → About → "Page transparency", or  GET /{username}?fields=id,name
  // { ref: 'makkahchamber', label: 'Makkah Chamber' },
  // { ref: 'qassimchamber', label: 'Qassim Chamber' },
];
