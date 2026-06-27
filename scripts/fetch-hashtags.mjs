#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Instagram Hashtag Search exporter.
//
// Pulls the top & most-recent PUBLIC posts for a set of hashtags straight from
// the Graph API — no OAuth round-trip, no database. Writes the result to
// .data/hashtags-export.json and prints a ranked summary.
//
// This is the LEGITIMATE alternative to reading competitor Pages (which Meta
// gates behind "Page Public Content Access" app review). It needs a connected
// Instagram Business account — pass its IG user id + a token with instagram_basic.
//
// Usage:
//   IG_USER_ID="1784..." META_TOKEN="EAAB..." node scripts/fetch-hashtags.mjs
//   META_TOKEN="EAAB..." node scripts/fetch-hashtags.mjs EasternProvince Dammam Vision2030
//   IG_USER_ID="1784..." META_TOKEN="EAAB..." HASHTAGS="EasternProvince,Dammam" node scripts/fetch-hashtags.mjs
//
// If IG_USER_ID is omitted, the script discovers it from the first connected
// Page's instagram_business_account using the token.
//
// LIMITS (Meta, enforced): one IG account may query at most 30 unique hashtags
// per rolling 7-day window. The response omits the author's username.
// ─────────────────────────────────────────────────────────────────────────────
import { promises as fs } from 'fs';
import path from 'path';

// --- minimal .env.local loader (so you don't have to export the token) -------
async function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const txt = await fs.readFile(path.join(process.cwd(), file), 'utf8');
      for (const line of txt.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    } catch { /* file optional */ }
  }
}

const GRAPH = 'https://graph.facebook.com';
let VERSION = 'v22.0';

async function g(node, params) {
  const qs = new URLSearchParams({ ...params }).toString();
  const resp = await fetch(`${GRAPH}/${VERSION}/${node}?${qs}`, { cache: 'no-store' });
  const json = await resp.json();
  if (!resp.ok || json.error) throw new Error(json?.error?.message || `HTTP ${resp.status}`);
  return json;
}
async function safe(node, params) {
  try { return await g(node, params); } catch (e) { return { error: e.message }; }
}

// Find an Instagram Business account id from the token's first Page if not given.
async function discoverIgUserId(token) {
  const acc = await safe('me/accounts', { access_token: token, fields: 'id,name', limit: '100' });
  for (const page of acc.data ?? []) {
    const link = await safe(page.id, { access_token: token, fields: 'instagram_business_account{id,username}' });
    if (link.instagram_business_account?.id) return link.instagram_business_account.id;
  }
  return null;
}

const MEDIA_FIELDS = 'id,caption,media_type,comments_count,like_count,permalink,timestamp,media_url';

function shapeMedia(raw) {
  const likeCount = raw.like_count ?? 0;
  const commentsCount = raw.comments_count ?? 0;
  return {
    id: raw.id,
    caption: raw.caption?.slice(0, 140),
    mediaType: raw.media_type,
    likeCount, commentsCount,
    permalink: raw.permalink,
    timestamp: raw.timestamp,
    eng: likeCount + commentsCount,
  };
}

async function fetchHashtag(tag, igUserId, token) {
  const clean = tag.replace(/^#/, '').trim();
  const search = await safe('ig_hashtag_search', { user_id: igUserId, q: clean, access_token: token });
  const id = search.data?.[0]?.id;
  if (!id) return { tag: clean, error: search.error || 'not found' };

  const [top, recent] = await Promise.all([
    safe(`${id}/top_media`, { user_id: igUserId, fields: MEDIA_FIELDS, limit: '12', access_token: token }),
    safe(`${id}/recent_media`, { user_id: igUserId, fields: MEDIA_FIELDS, limit: '12', access_token: token }),
  ]);
  const topMedia = (top.data ?? []).map(shapeMedia);
  const recentMedia = (recent.data ?? []).map(shapeMedia);
  return {
    tag: clean, id,
    topEng: topMedia.reduce((s, m) => s + m.eng, 0),
    top: topMedia,
    recent: recentMedia,
  };
}

async function main() {
  await loadEnv();
  VERSION = process.env.META_GRAPH_VERSION || VERSION;
  const token = process.env.META_TOKEN || process.env.META_PAGE_TOKEN;
  if (!token) {
    console.error('✗ No token. Set META_TOKEN (or META_PAGE_TOKEN) in .env.local or the environment.');
    process.exit(1);
  }

  const tags = [
    ...process.argv.slice(2),
    ...(process.env.HASHTAGS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
  ];
  if (!tags.length) {
    tags.push('EasternProvince', 'Dammam', 'SaudiBusiness', 'Vision2030');
    console.log('→ No hashtags given; using defaults:', tags.join(', '));
  }
  if (tags.length > 30) {
    console.warn(`⚠ ${tags.length} hashtags requested — Meta allows 30 unique / 7 days. Trimming to 30.`);
    tags.length = 30;
  }

  let igUserId = process.env.IG_USER_ID;
  if (!igUserId) {
    console.log('→ No IG_USER_ID set; discovering from the token…');
    igUserId = await discoverIgUserId(token);
    if (!igUserId) {
      console.error('✗ Could not find an Instagram Business account. Set IG_USER_ID explicitly.');
      process.exit(1);
    }
    console.log(`✓ Using Instagram account ${igUserId}`);
  }

  console.log(`→ Graph ${VERSION}. Searching ${tags.length} hashtag(s)…`);
  const results = [];
  for (const tag of tags) {
    process.stdout.write(`  · #${tag} … `);
    const r = await fetchHashtag(tag, igUserId, token);
    console.log(r.error ? `error: ${r.error}` : `${r.top.length} top, ${r.recent.length} recent`);
    results.push(r);
  }
  results.sort((a, b) => (b.topEng ?? 0) - (a.topEng ?? 0));

  const result = { fetchedAt: new Date().toISOString(), graphVersion: VERSION, igUserId, hashtags: results };
  const outDir = path.join(process.cwd(), '.data');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'hashtags-export.json');
  await fs.writeFile(outFile, JSON.stringify(result, null, 2), 'utf8');

  console.log(`\n✓ Wrote ${path.relative(process.cwd(), outFile)}`);
  for (const r of results) {
    if (r.error) { console.log(`  ▸ #${r.tag}: ${r.error}`); continue; }
    console.log(`  ▸ #${r.tag}: ${r.topEng} engagement across ${r.top.length} top posts`);
  }
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
