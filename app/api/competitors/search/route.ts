import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { searchPages } from '@/server/connectors/competitors';

// GET /api/competitors/search?q=chamber of commerce
// Keyword-searches public Facebook Pages via the Pages Search API (PPCA-gated).
// Returns each match with its category so you can pick competitors to benchmark.
export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ ok: false, error: 'q (keyword) required', results: [] }, { status: 400 });

  const accounts = await listAccounts();
  const token =
    accounts.find((a) => a.platform === 'facebook' && a.accessToken)?.accessToken ||
    process.env.META_PAGE_TOKEN || process.env.META_TOKEN || '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Connect a Facebook Page first (Accounts), or set META_PAGE_TOKEN.', results: [] });
  }

  const { results, error } = await searchPages(token, q);
  return NextResponse.json({ ok: !error, q, results, ...(error ? { error } : {}) });
}
