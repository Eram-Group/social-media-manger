import { NextRequest, NextResponse } from 'next/server';
import { getConnector, isSupported } from '@/server/connectors/registry';
import { ConnectedAccount } from '@/server/connectors/types';

// POST /api/posts/publish
// Body: { platform, accountId, accessToken, message?, imageUrl?, link?, scheduledPublishTime? }
//
// DEV: accountId/accessToken are passed in the body (copied from the connect
// callback). Once the DB is added, the body will reference a stored connected
// account by id and the server will load the (encrypted) token itself.
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
  if (!accountId || !accessToken) {
    return NextResponse.json({ error: 'accountId and accessToken are required' }, { status: 400 });
  }

  const account: ConnectedAccount = { platform, accountId, accessToken };
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
