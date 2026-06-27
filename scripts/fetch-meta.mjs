#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Standalone Meta (Facebook + Instagram) data exporter.
//
// Pulls REAL data straight from the Graph API using a token you already have —
// no OAuth round-trip, no database. Writes the result to .data/meta-export.json
// and prints a summary.
//
// Usage:
//   META_TOKEN="EAAB..." node scripts/fetch-meta.mjs
//   META_TOKEN="EAAB..." META_COMPETITORS="RiyadhChamber,jeddahchamber" node scripts/fetch-meta.mjs
//   node scripts/fetch-meta.mjs RiyadhChamber jeddahchamber   # competitors as args
//   node scripts/fetch-meta.mjs --search "chamber of commerce"  # keyword page search (PPCA)
//   META_SEARCH="chamber of commerce" node scripts/fetch-meta.mjs
//
// Token: a User token (discovers all your Pages) OR a single Page token.
// Get one from developers.facebook.com → Graph API Explorer, or Business Suite.
//
// Reading competitor pages you don't manage needs "Page Public Content Access"
// (app review); without it those pages come back with an `error` and are skipped.
// There is NO API to auto-discover pages by category — list competitors yourself.
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

// Safe wrapper — return {error} instead of throwing, so one failure doesn't stop the export.
async function safe(node, params) {
  try { return await g(node, params); } catch (e) { return { error: e.message }; }
}

async function discoverPages(token) {
  // User token → all managed Pages. Page token → /me/accounts errors, so fall back to /me.
  const acc = await safe('me/accounts', { access_token: token, fields: 'id,name,access_token,category,fan_count,followers_count', limit: '100' });
  if (acc.data?.length) return acc.data;
  const me = await safe('me', { access_token: token, fields: 'id,name,category,fan_count,followers_count' });
  if (me.id) return [{ ...me, access_token: token }];
  return [];
}

async function pageSnapshot(page) {
  const token = page.access_token;
  const out = { id: page.id, name: page.name, category: page.category, followers: page.followers_count ?? page.fan_count };

  // Page-level performance (last 28 days).
  const ins = await safe(`${page.id}/insights`, {
    access_token: token,
    metric: 'page_follows,page_post_engagements,page_views_total,page_video_views,page_total_actions',
    period: 'days_28',
  });
  out.stats = {};
  for (const m of ins.data ?? []) {
    const vals = m.values?.map((v) => Number(v.value) || 0) ?? [];
    out.stats[m.name] = m.name === 'page_follows' ? vals.at(-1) : vals.reduce((s, n) => s + n, 0);
  }
  if (ins.error) out.statsError = ins.error;

  // Recent posts + per-post engagement.
  const feed = await safe(`${page.id}/posts`, {
    access_token: token,
    fields: 'id,created_time,message,permalink_url,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)',
    limit: '15',
  });
  out.posts = (feed.data ?? []).map((p) => ({
    id: p.id,
    createdTime: p.created_time,
    message: p.message?.slice(0, 120),
    permalink: p.permalink_url,
    likes: p.likes?.summary?.total_count ?? 0,
    comments: p.comments?.summary?.total_count ?? 0,
    shares: p.shares?.count ?? 0,
  }));
  if (feed.error) out.postsError = feed.error;

  // Linked Instagram Business account + its 28-day stats.
  const link = await safe(page.id, { access_token: token, fields: 'instagram_business_account{id,username,followers_count}' });
  const ig = link.instagram_business_account;
  if (ig?.id) {
    const until = Math.floor(new Date().getTime() / 1000);
    const igIns = await safe(`${ig.id}/insights`, {
      access_token: token,
      metric: 'reach,views,accounts_engaged,total_interactions,likes,comments,shares,saves',
      period: 'day', metric_type: 'total_value',
      since: String(until - 28 * 86400), until: String(until),
    });
    out.instagram = { id: ig.id, username: ig.username, followers: ig.followers_count, stats: {} };
    for (const m of igIns.data ?? []) out.instagram.stats[m.name] = m.total_value?.value ?? 0;
    if (igIns.error) out.instagram.statsError = igIns.error;
  }
  return out;
}

const PUBLIC_FIELDS = 'id,name,username,category,fan_count,followers_count,talking_about_count,overall_star_rating,rating_count,link';

async function fetchCompetitor(ref, token) {
  const r = await safe(ref, { access_token: token, fields: PUBLIC_FIELDS });
  if (r.error) return { ref, error: r.error };
  return {
    ref, id: r.id, name: r.name, username: r.username, category: r.category,
    followers: r.followers_count ?? r.fan_count, talkingAbout: r.talking_about_count,
    rating: r.overall_star_rating ?? null, link: r.link,
  };
}

// Keyword-search public Pages via the Pages Search API. PPCA-gated — returns an
// {error} until "Page Public Content Access" is approved. Meta has no category
// filter; you search a term and each result carries its own `category`.
async function searchPages(q, token) {
  const r = await safe('pages/search', {
    access_token: token,
    q,
    fields: 'id,name,category,followers_count,fan_count,link,verification_status',
    limit: '25',
  });
  if (r.error) return { q, error: r.error, results: [] };
  const results = (r.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    followers: p.followers_count ?? p.fan_count,
    link: p.link,
    verified: p.verification_status === 'blue_verified' || p.verification_status === 'gray_verified',
  }));
  return { q, results };
}

function groupByCategory(pages) {
  const groups = {};
  for (const p of pages) {
    if (p.error || !p.category) continue;
    (groups[p.category] ??= []).push(p);
  }
  return Object.entries(groups).map(([category, list]) => ({
    category,
    pages: list.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)),
  }));
}

async function main() {
  await loadEnv();
  VERSION = process.env.META_GRAPH_VERSION || VERSION;
  const token = process.env.META_TOKEN || process.env.META_PAGE_TOKEN;
  if (!token) {
    console.error('✗ No token. Set META_TOKEN (or META_PAGE_TOKEN) in .env.local or the environment.');
    process.exit(1);
  }

  // Pull out the --search/-s flag; everything else positional is a competitor ref.
  const argv = process.argv.slice(2);
  let searchTerm = process.env.META_SEARCH || '';
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--search' || argv[i] === '-s') searchTerm = argv[++i] || '';
    else positional.push(argv[i]);
  }
  const competitorRefs = [
    ...positional,
    ...(process.env.META_COMPETITORS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
  ];

  console.log(`→ Graph ${VERSION}. Discovering pages…`);
  const pages = await discoverPages(token);
  if (!pages.length) {
    console.error('✗ Token returned 0 pages. Is it a valid User/Page token with pages_show_list?');
    process.exit(1);
  }
  console.log(`✓ ${pages.length} page(s): ${pages.map((p) => p.name).join(', ')}`);

  const ownPages = [];
  for (const p of pages) {
    console.log(`  · snapshot: ${p.name}`);
    ownPages.push(await pageSnapshot(p));
  }

  let competitors = [];
  if (competitorRefs.length) {
    console.log(`→ Fetching ${competitorRefs.length} competitor page(s)…`);
    const refToken = pages[0].access_token || token;
    competitors = await Promise.all(competitorRefs.map((r) => fetchCompetitor(r, refToken)));
    const blocked = competitors.filter((c) => c.error);
    if (blocked.length) console.log(`  ⚠ ${blocked.length} blocked (need Page Public Content Access): ${blocked.map((b) => b.ref).join(', ')}`);
  } else {
    console.log('→ No competitors given (pass as args or set META_COMPETITORS). Skipping.');
  }

  // Keyword page search (PPCA-gated).
  let search = null;
  if (searchTerm) {
    console.log(`→ Searching pages for "${searchTerm}"…`);
    const refToken = pages[0].access_token || token;
    search = await searchPages(searchTerm, refToken);
    if (search.error) {
      console.log(`  ⚠ ${search.error}`);
    } else {
      console.log(`  ✓ ${search.results.length} page(s):`);
      for (const p of search.results) {
        console.log(`     · ${p.name}${p.verified ? ' ✓' : ''} — ${p.category || '?'} — ${p.followers ?? '?'} followers (${p.id})`);
      }
    }
  }

  const selfForGrouping = ownPages.map((p) => ({ ...p, isSelf: true }));
  const result = {
    fetchedAt: new Date().toISOString(),
    graphVersion: VERSION,
    ownPages,
    competitors,
    ...(search ? { search } : {}),
    byCategory: groupByCategory([...selfForGrouping, ...competitors]),
  };

  const outDir = path.join(process.cwd(), '.data');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'meta-export.json');
  await fs.writeFile(outFile, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\n✓ Wrote ${path.relative(process.cwd(), outFile)}`);
  console.log(`  Own pages: ${ownPages.length} | Competitors: ${competitors.filter((c) => !c.error).length} readable`);
  for (const grp of result.byCategory) {
    console.log(`  ▸ ${grp.category}: ${grp.pages.map((p) => `${p.name || p.ref}${p.isSelf ? ' (you)' : ''} ${p.followers ?? '?'}`).join('  ·  ')}`);
  }
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
