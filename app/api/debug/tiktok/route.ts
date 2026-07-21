import { NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { ttPost, ensureFreshToken } from '@/server/connectors/tiktok';
import { TIKTOK } from '@/server/env';

// GET /api/debug/tiktok — read-only. Asks TikTok what it believes about the
// connected account so publish failures can be diagnosed without guessing.
// Returns no tokens.
export async function GET() {
  const acc = (await listAccounts()).find((a) => a.platform === 'tiktok');
  if (!acc) return NextResponse.json({ error: 'No TikTok account connected.' }, { status: 404 });

  const out: Record<string, unknown> = {
    accountId: acc.accountId,
    name: acc.name,
    clientKey: TIKTOK.clientKey,
    isSandboxKey: TIKTOK.clientKey.startsWith('sb'),
  };

  try {
    const fresh = await ensureFreshToken(acc);
    const r = await ttPost<{ data?: Record<string, unknown> }>(
      fresh.accessToken, '/post/publish/creator_info/query/', {},
    );
    const d = r.data ?? {};
    out.creatorNickname = d.creator_nickname;
    out.privacyLevelOptions = d.privacy_level_options;
    // If TikTok offers PUBLIC_TO_EVERYONE the account is NOT private, which is
    // what `unaudited_client_can_only_post_to_private_accounts` complains about.
    out.accountLooksPrivate = Array.isArray(d.privacy_level_options)
      && !(d.privacy_level_options as string[]).includes('PUBLIC_TO_EVERYONE');
    out.weWouldSend = TIKTOK.clientKey.startsWith('sb') ? 'SELF_ONLY' : 'best available';
  } catch (e) {
    out.creatorInfoError = (e as Error).message;
  }

  return NextResponse.json(out);
}
