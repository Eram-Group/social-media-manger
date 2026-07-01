import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';

// base64url(no padding) of an ArrayBuffer/Uint8Array — used for PKCE.
function base64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// OAuth 2.0 PKCE pair: a random code_verifier + its S256 code_challenge.
async function makePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)).buffer);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(digest) };
}

// GET /api/connect/:platform  — start the OAuth flow (redirects to the provider).
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const { platform } = params;
  if (!isSupported(platform)) {
    return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
  }
  const connector = getConnector(platform);
  try {
    connector.assertConfigured?.();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // CSRF protection: random state echoed back by the provider, verified in the callback.
  const state = crypto.randomUUID();

  // PKCE (X only): generate a verifier, send its challenge, cookie the verifier.
  let verifier: string | undefined;
  let authUrl: string;
  if (connector.usesPkce) {
    const pkce = await makePkce();
    verifier = pkce.verifier;
    authUrl = connector.getAuthUrl(state, pkce.challenge);
  } else {
    authUrl = connector.getAuthUrl(state);
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  const res = NextResponse.redirect(authUrl);
  res.cookies.set(`oauth_state_${platform}`, state, cookieOpts);
  if (verifier) res.cookies.set(`oauth_verifier_${platform}`, verifier, cookieOpts);
  return res;
}
