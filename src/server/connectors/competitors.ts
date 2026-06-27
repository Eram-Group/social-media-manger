// Competitor / "same-category" page intelligence via the Meta Graph API.
//
// What works:  reading PUBLIC fields of a Facebook Page (name, category, fan/
//   follower counts, talking_about_count, rating). Your OWN pages always work.
// What's limited:  reading Pages you do NOT manage needs the app to hold
//   "Page Public Content Access" (app review). Without it Meta errors per page —
//   we capture the error on that page instead of failing the whole request.
// What's impossible:  asking Meta "give me all pages in category X". No such API
//   exists. Competitors must be listed explicitly (see competitors.config.ts).
import { graphGet } from './meta';
import { COMPETITORS, CompetitorRef } from './competitors.config';

// Public, comparison-relevant fields. category_list gives the granular category
// objects; category is the primary label we group by.
const PUBLIC_FIELDS =
  'id,name,username,category,category_list,fan_count,followers_count,talking_about_count,were_here_count,rating_count,overall_star_rating,link,verification_status';

// Derived from a page's recent posts. Works for your OWN pages today; for
// competitor pages it requires "Page Public Content Access" (PPCA) — so it stays
// undefined until approval, then fills in automatically.
export interface PostsAnalysis {
  postCount: number;
  postsPerWeek: number;
  avgEng: number; // avg (likes + comments + shares) per post
  engagementRate: number | null; // avgEng ÷ followers · 100
}

export interface CompetitorPage {
  ref: string;
  label?: string;
  id?: string;
  name?: string;
  username?: string;
  category?: string;
  categories?: string[];
  followers?: number;
  fans?: number;
  talkingAbout?: number;
  rating?: number | null;
  ratingCount?: number;
  verified?: boolean;
  link?: string;
  /** Recent-post cadence & engagement (PPCA-gated for non-managed pages). */
  analysis?: PostsAnalysis;
  /** Set when this page could not be read (e.g. PPCA not granted, bad ref). */
  error?: string;
  /** True for the chamber's own page(s), so the UI can highlight "you". */
  isSelf?: boolean;
}

interface RawPage {
  id?: string;
  name?: string;
  username?: string;
  category?: string;
  category_list?: { id: string; name: string }[];
  fan_count?: number;
  followers_count?: number;
  talking_about_count?: number;
  rating_count?: number;
  overall_star_rating?: number;
  link?: string;
  verification_status?: string;
}

function shape(ref: CompetitorRef, raw: RawPage, isSelf = false): CompetitorPage {
  return {
    ref: ref.ref,
    label: ref.label,
    id: raw.id,
    name: raw.name,
    username: raw.username,
    category: raw.category,
    categories: raw.category_list?.map((c) => c.name) ?? [],
    followers: raw.followers_count ?? raw.fan_count,
    fans: raw.fan_count,
    talkingAbout: raw.talking_about_count,
    rating: raw.overall_star_rating ?? null,
    ratingCount: raw.rating_count ?? 0,
    verified: raw.verification_status === 'blue_verified' || raw.verification_status === 'gray_verified',
    link: raw.link,
    isSelf,
  };
}

// Fetch one page's public data. Never throws — returns an {error} page so one
// bad/blocked competitor doesn't sink the whole comparison.
export async function fetchCompetitorPage(ref: CompetitorRef, token: string, isSelf = false): Promise<CompetitorPage> {
  try {
    const raw = await graphGet<RawPage>(ref.ref, { access_token: token, fields: PUBLIC_FIELDS });
    return shape(ref, raw, isSelf);
  } catch (e) {
    const msg = (e as Error).message;
    // Make the common "not allowed" case readable for non-engineers.
    const friendly = /#(10|200|278|3)\b|permission|Public Content|not have access/i.test(msg)
      ? 'Meta blocked this page — reading pages you don’t manage needs "Page Public Content Access" (app review).'
      : msg;
    return { ref: ref.ref, label: ref.label, error: friendly };
  }
}

export async function fetchCompetitors(token: string, refs: CompetitorRef[] = COMPETITORS): Promise<CompetitorPage[]> {
  return Promise.all(refs.map((r) => fetchCompetitorPage(r, token)));
}

export interface PageSearchResult {
  id: string;
  name?: string;
  category?: string;
  followers?: number;
  link?: string;
  verified?: boolean;
}

// Search public Pages by KEYWORD via the Pages Search API. Meta has no "list all
// pages in category X" endpoint — you search a term (e.g. "chamber of commerce")
// and each result carries its own `category` so you can pick by it. PPCA-gated:
// returns a friendly error until "Page Public Content Access" is approved.
export async function searchPages(token: string, q: string): Promise<{ results: PageSearchResult[]; error?: string }> {
  try {
    const r = await graphGet<{ data: RawPage[] }>('pages/search', {
      access_token: token,
      q,
      fields: 'id,name,category,followers_count,fan_count,link,verification_status',
      limit: '25',
    });
    const results: PageSearchResult[] = (r.data ?? []).map((raw) => ({
      id: raw.id!,
      name: raw.name,
      category: raw.category,
      followers: raw.followers_count ?? raw.fan_count,
      link: raw.link,
      verified: raw.verification_status === 'blue_verified' || raw.verification_status === 'gray_verified',
    }));
    return { results };
  } catch (e) {
    const msg = (e as Error).message;
    const friendly = /#(10|200|278|3)\b|permission|Public Content|not have access/i.test(msg)
      ? 'Page search needs “Page Public Content Access” (App Review). Once approved, searching real pages works here automatically.'
      : msg;
    return { results: [], error: friendly };
  }
}

// Analyze a page's recent posts (cadence + engagement). Returns null on any error
// so a PPCA-blocked competitor simply has no analysis rather than failing.
export async function fetchPostsAnalysis(idOrRef: string, token: string, followers?: number): Promise<PostsAnalysis | null> {
  try {
    const r = await graphGet<{ data: any[] }>(`${idOrRef}/posts`, {
      access_token: token,
      fields: 'id,created_time,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
      limit: '25',
    });
    const posts = r.data ?? [];
    if (!posts.length) return null;
    let totalEng = 0;
    let oldest = Infinity;
    let newest = 0;
    for (const p of posts) {
      const likes = p.likes?.summary?.total_count ?? 0;
      const comments = p.comments?.summary?.total_count ?? 0;
      const shares = p.shares?.count ?? 0;
      totalEng += likes + comments + shares;
      const ts = new Date(p.created_time).getTime();
      if (ts) { oldest = Math.min(oldest, ts); newest = Math.max(newest, ts); }
    }
    const avgEng = Math.round(totalEng / posts.length);
    const spanDays = newest > oldest ? (newest - oldest) / 86_400_000 : 0;
    const postsPerWeek = spanDays > 0 ? Math.round((posts.length / spanDays) * 7 * 10) / 10 : posts.length;
    const engagementRate = followers ? Math.round((avgEng / followers) * 1000) / 10 : null;
    return { postCount: posts.length, postsPerWeek, avgEng, engagementRate };
  } catch {
    return null;
  }
}

// Attach posts analysis to readable pages (skips errored/blocked ones).
export async function enrichWithPosts(page: CompetitorPage, token: string): Promise<CompetitorPage> {
  if (page.error || !(page.id || page.username)) return page;
  const analysis = await fetchPostsAnalysis(page.id ?? page.ref, token, page.followers);
  return analysis ? { ...page, analysis } : page;
}

export interface CategoryGroup {
  category: string;
  pages: CompetitorPage[]; // sorted by followers desc; self flagged via isSelf
}

// Group readable pages by their primary category and rank by followers within
// each — this is the "same category" comparison the dashboard renders.
export function groupByCategory(pages: CompetitorPage[]): CategoryGroup[] {
  const groups = new Map<string, CompetitorPage[]>();
  for (const p of pages) {
    if (p.error || !p.category) continue;
    const list = groups.get(p.category) ?? [];
    list.push(p);
    groups.set(p.category, list);
  }
  return [...groups.entries()]
    .map(([category, list]) => ({
      category,
      pages: list.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)),
    }))
    .sort((a, b) => b.pages.length - a.pages.length);
}
