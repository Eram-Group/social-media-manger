import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';
import { assertMetaConfigured } from '@/server/env';

// GET /api/connect/:platform  — start the OAuth flow (redirects to the provider).
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const { platform } = params;
  if (!isSupported(platform)) {
    return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
  }
  try {
    assertMetaConfigured();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // CSRF protection: random state echoed back by the provider, verified in the callback.
  const state = crypto.randomUUID();
  const authUrl = getConnector(platform).getAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
