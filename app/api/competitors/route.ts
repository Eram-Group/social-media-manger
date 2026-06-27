import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { getCached } from '@/server/cache';
import {
  fetchCompetitorPage,
  fetchCompetitors,
  enrichWithPosts,
  groupByCategory,
  CompetitorPage,
} from '@/server/connectors/competitors';
import { COMPETITORS } from '@/server/connectors/competitors.config';
import { listWatchedPages } from '@/server/competitors-store';

// GET /api/competitors — your pages + the configured competitor watch-list,
// grouped by category and ranked by followers. Cached 6h (?refresh=1 to force).
//
// Token resolution (first that exists):
//   1. a connected Facebook Page token (from the OAuth flow / store), else
//   2. META_PAGE_TOKEN / META_TOKEN in env (paste a Page or long-lived token
//      to use this without going through OAuth).
export async function GET(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('refresh') === '1';
  const cached = await getCached('competitors', 6 * 60 * 60, computeCompetitors, force);
  return NextResponse.json({ ...cached.data, cachedAt: cached.cachedAt, fromCache: cached.fromCache });
}

async function computeCompetitors() {
  const accounts = await listAccounts();
  const fbAccounts = accounts.filter((a) => a.platform === 'facebook' && a.accessToken);

  const token = fbAccounts[0]?.accessToken || process.env.META_PAGE_TOKEN || process.env.META_TOKEN || '';
  if (!token) {
    return {
      ok: false,
      available: false,
      reason: 'no-token',
      message:
        'No Facebook token. Connect a Page in Accounts, or set META_PAGE_TOKEN in .env.local.',
      groups: [],
      self: [],
      competitors: [],
    };
  }

  // Own pages — read with each page's own token (always allowed), flagged isSelf.
  // Enrich with posts analysis (cadence + engagement) — always works for self.
  const self: CompetitorPage[] = await Promise.all(
    fbAccounts.map(async (a) => {
      const page = await fetchCompetitorPage({ ref: a.accountId, label: a.name }, a.accessToken, true);
      return enrichWithPosts(page, a.accessToken);
    }),
  );

  // Watch-list = static config + pages the user picked from Pages Search.
  const watched = await listWatchedPages();
  const refs = [...COMPETITORS, ...watched.map((w) => ({ ref: w.ref, label: w.label ?? undefined }))];

  // Read with the resolved token. Readable pages (i.e. once PPCA is approved) get
  // the same posts analysis, so real competitor benchmarks appear automatically;
  // blocked pages keep their `error`.
  const rawCompetitors = await fetchCompetitors(token, refs);
  const competitors = await Promise.all(rawCompetitors.map((c) => enrichWithPosts(c, token)));

  if (!refs.length) {
    return {
      ok: true,
      available: true,
      reason: 'no-competitors-configured',
      message:
        'Add competitor pages in src/server/connectors/competitors.config.ts (Meta has no API to auto-discover them by category).',
      groups: groupByCategory(self),
      self,
      competitors: [],
    };
  }

  const groups = groupByCategory([...self, ...competitors]);
  const blocked = competitors.filter((c) => c.error);

  return {
    ok: true,
    available: true,
    groups,
    self,
    competitors,
    blockedCount: blocked.length,
    ...(blocked.length
      ? { note: 'Some competitor pages could not be read — see each page\'s `error`. Most need "Page Public Content Access".' }
      : {}),
  };
}
