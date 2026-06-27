import { NextRequest, NextResponse } from 'next/server';
import { upsertAccounts } from '@/server/store';
import { ConnectedAccount } from '@/server/connectors/types';
import { META } from '@/server/env';
import { getLongLivedUserToken, discoverPages, graphGet } from '@/server/connectors/meta';

// GET /api/connect/from-token  — connect accounts from a raw user token WITHOUT
// the full OAuth redirect dance. Handy when you already have a token from the
// Graph API Explorer / Business Suite.
//
//   token: ?token=EAAB...   (falls back to META_TOKEN / META_PAGE_TOKEN in env)
//
// Steps: short-lived user token -> long-lived user token (uses META_APP_ID/SECRET,
// so the resulting Page tokens DON'T EXPIRE) -> discover Pages -> find each Page's
// linked Instagram Business account -> persist all of them in the store.
export async function GET(req: NextRequest) {
  const token =
    new URL(req.url).searchParams.get('token') ||
    process.env.META_TOKEN ||
    process.env.META_PAGE_TOKEN ||
    '';
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'No token. Pass ?token=... or set META_TOKEN in .env.' },
      { status: 400 },
    );
  }

  try {
    // Upgrade to a long-lived user token so the derived Page tokens are permanent.
    // Needs the app id/secret; if missing or it fails, use the token as-is.
    let userToken = token;
    let permanent = false;
    if (META.appId && META.appSecret) {
      try {
        userToken = await getLongLivedUserToken(token);
        permanent = true;
      } catch (e) {
        console.warn('[from-token] long-lived exchange failed, using token as-is:', (e as Error).message);
      }
    }

    const pages = await discoverPages(userToken);
    if (!pages.length) {
      return NextResponse.json(
        { ok: false, error: 'Token returned 0 Pages. Make sure it has pages_show_list and you manage a Page.' },
        { status: 400 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const accounts: ConnectedAccount[] = [];

    for (const p of pages) {
      // Facebook Page.
      accounts.push({
        platform: 'facebook',
        accountId: p.id,
        name: p.name,
        accessToken: p.access_token,
        tokenExpiresAt: null,
        followers: p.followers_count ?? p.fan_count,
        connectedAt: now,
      });

      // Linked Instagram Business account (if any).
      try {
        const info = await graphGet<{ instagram_business_account?: { id: string; username?: string; followers_count?: number } }>(
          p.id,
          { access_token: p.access_token, fields: 'instagram_business_account{id,username,followers_count}' },
        );
        const ig = info.instagram_business_account;
        if (ig?.id) {
          accounts.push({
            platform: 'instagram',
            accountId: ig.id,
            name: ig.username ? `@${ig.username}` : p.name,
            accessToken: p.access_token, // the Page token is used for IG Graph calls
            tokenExpiresAt: null,
            followers: ig.followers_count,
            connectedAt: now,
            meta: { pageId: p.id },
          });
        }
      } catch (e) {
        console.warn(`[from-token] no IG for page ${p.id}:`, (e as Error).message);
      }
    }

    await upsertAccounts(accounts);

    return NextResponse.json({
      ok: true,
      permanentTokens: permanent,
      connected: accounts.map((a) => ({ platform: a.platform, accountId: a.accountId, name: a.name, followers: a.followers })),
      message: permanent
        ? 'Connected with permanent Page tokens. Open the dashboard — it now shows real data.'
        : 'Connected, but tokens are short-lived (set META_APP_ID/SECRET to make them permanent).',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
