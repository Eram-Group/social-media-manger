import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';
import { upsertAccounts } from '@/server/store';
import { APP_BASE_URL } from '@/server/env';

// GET /api/connect/:platform/callback — provider redirects here with ?code & ?state.
// Exchanges the code for connectable accounts (Pages / IG accounts), persists them
// server-side (tokens stay on the server), then redirects back to the Accounts page.
export async function GET(req: NextRequest, { params }: { params: { platform: string } }) {
  const { platform } = params;
  if (!isSupported(platform)) {
    return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (oauthError) return NextResponse.json({ error: oauthError }, { status: 400 });
  if (!code) return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 });

  const expectedState = req.cookies.get(`oauth_state_${platform}`)?.value;
  if (!expectedState || expectedState !== state) {
    return NextResponse.json({ error: 'Invalid or missing OAuth state' }, { status: 400 });
  }

  const accountsUrl = (qs: string) => NextResponse.redirect(`${APP_BASE_URL}/epcc-demo/accounts?${qs}`);

  try {
    const accounts = await getConnector(platform).exchangeCode(code);
    if (!accounts.length) {
      const reason = platform === 'instagram' ? 'no_ig_account'
        : platform === 'linkedin' ? 'no_orgs'
        : platform === 'snapchat' ? 'no_profiles'
        : platform === 'tiktok' ? 'no_tiktok_account'
        : 'no_pages';
      return accountsUrl(`error=${reason}&platform=${platform}`);
    }
    const now = Math.floor(Date.now() / 1000);
    await upsertAccounts(accounts.map((a) => ({ ...a, connectedAt: now })));
    return accountsUrl(`connected=${platform}&count=${accounts.length}`);
  } catch (e) {
    return accountsUrl(`error=${encodeURIComponent((e as Error).message)}&platform=${platform}`);
  }
}
