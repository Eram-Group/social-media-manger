import { NextRequest, NextResponse } from 'next/server';
import { findAccount } from '@/server/store';
import { graphPost } from '@/server/connectors/meta';

// POST /api/inbox/reply  { platform, accountId, commentId, message }
// Replies to a comment on a Facebook Page post. Requires pages_manage_engagement.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { platform, accountId, commentId, message } = body ?? {};
  if (platform !== 'facebook' && platform !== 'instagram') {
    return NextResponse.json({ error: `Replying not supported for ${platform}` }, { status: 400 });
  }
  if (!accountId || !commentId || !message?.trim()) {
    return NextResponse.json({ error: 'accountId, commentId and message are required' }, { status: 400 });
  }

  const account = await findAccount(platform, accountId);
  if (!account) return NextResponse.json({ error: 'Account not connected' }, { status: 404 });

  try {
    // Facebook: POST /{comment-id}/comments {message}
    // Instagram: POST /{comment-id}/replies {message}
    const edge = platform === 'instagram' ? 'replies' : 'comments';
    const res = await graphPost<{ id: string }>(`${commentId}/${edge}`, {
      message: message.trim(),
      access_token: account.accessToken,
    });
    return NextResponse.json({ ok: true, id: res.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
