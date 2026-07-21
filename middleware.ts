import { NextRequest, NextResponse } from 'next/server';

// TikTok's URL-ownership check fetches a signature file whose filename it chooses
// itself, and the portal doesn't tell us that name in advance. So map ANY
// root-level `tiktok*.txt` request onto the one signature file we actually ship.
//
// A rewrite (not a generated response) keeps
// public/tiktok-developers-site-verification.txt as the single source of truth —
// update that file and every alias follows automatically.
const SIGNATURE_FILE = '/tiktok-developers-site-verification.txt';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname !== SIGNATURE_FILE && /^\/tiktok[\w.\-]*\.txt$/i.test(pathname)) {
    return NextResponse.rewrite(new URL(SIGNATURE_FILE, req.url));
  }
  return NextResponse.next();
}

// Only .txt requests reach this middleware.
export const config = { matcher: '/(.*\\.txt)' };
