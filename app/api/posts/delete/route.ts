import { NextRequest, NextResponse } from 'next/server';
import { getConnector } from '@/server/connectors/registry';
import { findAccount } from '@/server/store';

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
      results.push({ ...ref, ok: true });
    } catch (e) {
      results.push({ ...ref, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
