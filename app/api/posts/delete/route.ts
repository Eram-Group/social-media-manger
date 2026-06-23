import { NextRequest, NextResponse } from 'next/server';
import { getConnector } from '@/server/connectors/registry';
import { findAccount, hidePosts } from '@/server/store';

// POST /api/posts/delete  { refs: [{ platform, accountId, remoteId }] }
// Deletes the post from each platform it was published to. Returns per-ref result.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const refs: { platform: string; accountId: string; remoteId: string }[] = body?.refs ?? [];
  if (!refs.length) return NextResponse.json({ ok: true, results: [] });

  const results = [];
  for (const ref of refs) {
    try {
      const account = await findAccount(ref.platform, ref.accountId);
      if (!account) throw new Error('Account not connected');
      const connector = getConnector(ref.platform);
      if (!connector.deletePost) throw new Error(`Delete not supported for ${ref.platform}`);
      await connector.deletePost(account, ref.remoteId);
      results.push({ ...ref, ok: true, deleted: true });
    } catch (e) {
      // Can't delete on the platform (e.g. Instagram) — hide it from the
      // dashboard instead so the action still does something useful.
      await hidePosts([ref.remoteId]);
      results.push({ ...ref, ok: true, hiddenOnly: true, error: (e as Error).message });
    }
  }
  const hiddenOnly = results.some((r) => r.hiddenOnly);
  return NextResponse.json({ ok: true, hiddenOnly, results });
}
