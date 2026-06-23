import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';

// GET /api/connect/:platform/callback — provider redirects here with ?code & ?state.
// Exchanges the code for connectable accounts (Pages / IG accounts).
//
// DEV NOTE: this returns the access tokens as JSON so you can test publishing
// immediately. Once the database is wired up, tokens will be stored ENCRYPTED
// server-side and this endpoint will redirect into the app instead of echoing them.
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

  try {
    const accounts = await getConnector(platform).exchangeCode(code);
    if (!accounts.length) {
      return NextResponse.json(
        {
          ok: false,
          platform,
          error:
            platform === 'instagram'
              ? 'No Instagram Business account is linked to your Page(s). Link one in the Page settings and retry.'
              : 'No Pages found for this account. Make sure you are an admin of at least one Page.',
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      platform,
      note: 'DEV ONLY — tokens are shown so you can test publishing. They will be stored encrypted server-side once the DB is added.',
      accounts,
      howToPublish: {
        method: 'POST',
        url: '/api/posts/publish',
        body: { platform, accountId: '<accountId from above>', accessToken: '<accessToken from above>', message: 'Hello from the Chamber 🚀', imageUrl: '(optional public image URL)' },
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
