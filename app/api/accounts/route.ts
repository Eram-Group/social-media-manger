import { NextRequest, NextResponse } from 'next/server';
import { listAccounts, removeAccount, toPublic } from '@/server/store';

// GET /api/accounts — list connected accounts (WITHOUT access tokens).
export async function GET() {
  const accounts = await listAccounts();
  return NextResponse.json({ accounts: accounts.map(toPublic) });
}

// DELETE /api/accounts?platform=facebook&accountId=123 — disconnect an account.
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform');
  const accountId = url.searchParams.get('accountId');
  if (!platform || !accountId) {
    return NextResponse.json({ error: 'platform and accountId are required' }, { status: 400 });
  }
  await removeAccount(platform, accountId);
  return NextResponse.json({ ok: true });
}
