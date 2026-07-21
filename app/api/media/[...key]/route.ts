import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

// GET /api/media/<blob pathname>
//
// Streams a Vercel Blob object back from THIS domain. TikTok's PULL_FROM_URL
// only accepts media from a domain whose ownership is verified, and Blob serves
// from `<store>.public.blob.vercel-storage.com` — a domain we cannot verify (no
// DNS control, no way to host a file at its root). Proxying through
// {APP_BASE_URL}/api/media/ puts the media on the verified app domain instead.
//
// The key is resolved via the Blob API rather than by rebuilding the public
// hostname, so a caller can only ever reach objects inside our own store — this
// is deliberately not a general-purpose URL proxy.
// TikTok's URL-prefix verification wants the signature file served from the
// prefix itself, not just the domain root — so /api/media/<file> must answer it
// rather than trying to resolve it as a blob key.
const TIKTOK_VERIFY_FILE = 'tiktok-developers-site-verification.txt';

export async function GET(_req: NextRequest, { params }: { params: { key: string[] } }) {
  const pathname = params.key.map(decodeURIComponent).join('/');

  if (pathname === TIKTOK_VERIFY_FILE) {
    const token = process.env.TIKTOK_SITE_VERIFICATION ?? '';
    return new NextResponse(token ? `${token}\n` : '', {
      status: token ? 200 : 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Blob storage is not configured.' }, { status: 500 });
  }
  try {
    const { blobs } = await list({
      prefix: pathname,
      limit: 1,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const blob = blobs.find((b) => b.pathname === pathname);
    if (!blob) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const upstream = await fetch(blob.url, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        // TikTok issues a ranged/streaming pull; keep the length so it can size the download.
        ...(upstream.headers.get('content-length')
          ? { 'Content-Length': upstream.headers.get('content-length') as string }
          : {}),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
