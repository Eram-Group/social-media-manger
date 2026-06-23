import { NextRequest, NextResponse } from 'next/server';
import { findAccount } from '@/server/store';
import { graphPost, graphDelete } from '@/server/connectors/meta';

// POST /api/inbox/comment-action  { action: 'hide'|'unhide'|'delete', platform, accountId, commentId }
// Moderates a comment on the platform. Hide/unhide and delete are supported by
// both Facebook and Instagram. (Blocking an individual commenter is not exposed
// by Meta's API, so the UI uses delete instead.)
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, platform, accountId, commentId } = body ?? {};
  if (!platform || !accountId || !commentId) {
    return NextResponse.json({ error: 'platform, accountId and commentId are required' }, { status: 400 });
  }
  const account = await findAccount(platform, accountId);
  if (!account) return NextResponse.json({ error: 'Account not connected' }, { status: 404 });
  const token = account.accessToken;

  try {
    if (action === 'delete') {
      await graphDelete(commentId, { access_token: token });
    } else if (action === 'hide' || action === 'unhide') {
      const hidden = action === 'hide';
      // Facebook uses is_hidden; Instagram uses hide.
      const params = platform === 'instagram'
        ? { hide: String(hidden), access_token: token }
        : { is_hidden: String(hidden), access_token: token };
      await graphPost(commentId, params);
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
