import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';
import { ConnectedAccount } from '@/server/connectors/types';
import { findAccount } from '@/server/store';

// POST /api/posts/publish
// Body: { platform, accountId, accessToken?, message?, imageUrl?, link?, scheduledPublishTime? }
//
// The access token is resolved server-side from the stored connected account
// (so the browser never handles it). Passing accessToken explicitly still works
// for quick CLI testing.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { platform, accountId, accessToken, message, imageUrl, link, scheduledPublishTime } = body ?? {};
  if (!platform || !isSupported(platform)) {
    return NextResponse.json({ error: `Missing or unsupported platform: ${platform}` }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  // Prefer the stored token; fall back to an explicit one in the body.
  const stored = await findAccount(platform, accountId);
  const token = accessToken || stored?.accessToken;
  if (!token) {
    return NextResponse.json({ error: 'No access token found for this account. Connect it first.' }, { status: 400 });
  }

  const account: ConnectedAccount = { platform, accountId, accessToken: token, meta: stored?.meta };
  try {
    const result = await getConnector(platform).publish(account, {
      message,
      imageUrl,
      link,
      scheduledPublishTime,
    });
    return NextResponse.json({ ok: true, platform, result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
