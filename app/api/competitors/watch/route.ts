import { NextRequest, NextResponse } from 'next/server';
import { listWatchedPages, addWatchedPage, removeWatchedPage } from '@/server/competitors-store';
import { invalidate } from '@/server/cache';

const now = () => Math.floor(Date.now() / 1000);

// Pages the user picked from search to read LIVE (via PPCA). They're merged into
// /api/competitors so they appear as real benchmark rows once access is granted.
export async function GET() {
  return NextResponse.json({ ok: true, watched: await listWatchedPages() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ref = String(body.ref ?? '').trim();
  if (!ref) return NextResponse.json({ ok: false, error: 'ref required' }, { status: 400 });
  await addWatchedPage({ ref, label: body.label ? String(body.label) : null, addedAt: now() });
  await invalidate('competitors'); // so the benchmark re-fetches with the new page
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ref = new URL(req.url).searchParams.get('ref');
  if (!ref) return NextResponse.json({ ok: false, error: 'ref required' }, { status: 400 });
  await removeWatchedPage(ref);
  await invalidate('competitors');
  return NextResponse.json({ ok: true });
}
