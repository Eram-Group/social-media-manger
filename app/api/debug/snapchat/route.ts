import { NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { snapProfileGet, snapGet, ensureFreshToken } from '@/server/connectors/snapchat';
import { SNAPCHAT, redirectUri } from '@/server/env';
import { SNAP_API, SNAP_PROFILE_API, SNAPCHAT_SCOPES } from '@/server/connectors/snapchat.config';

// GET /api/debug/snapchat — read-only. Reports the OAuth config we send and,
// when an account is connected, the raw result of each Public Profile API call
// so failures are attributable (scope vs allowlist vs membership vs wrong path).
// Returns no tokens.
// Never cache: this reports live connection state.
export const dynamic = 'force-dynamic';

export async function GET() {
  const out: Record<string, unknown> = {
    config: {
      clientId: SNAPCHAT.clientId || '(missing)',
      clientSecretSet: Boolean(SNAPCHAT.clientSecret),
      redirectUri: redirectUri('snapchat'),
      scopes: SNAPCHAT_SCOPES,
      adsHost: SNAP_API,
      profileHost: SNAP_PROFILE_API,
    },
  };

  const acc = (await listAccounts()).find((a) => a.platform === 'snapchat');
  if (!acc) {
    out.connected = false;
    out.hint = 'No Snapchat account stored yet — connect from the Accounts screen, then re-open this endpoint.';
    return NextResponse.json(out);
  }

  out.connected = true;
  out.account = { accountId: acc.accountId, name: acc.name };
  // Set when OAuth succeeded but Public Profile discovery did not.
  const discoveryError = (acc.meta as Record<string, unknown> | undefined)?.discoveryError;
  if (discoveryError) out.discoveryError = discoveryError;

  let token: string;
  try {
    token = (await ensureFreshToken(acc)).accessToken;
  } catch (e) {
    out.tokenError = (e as Error).message;
    return NextResponse.json(out);
  }

  // Each probe is reported independently — one failing must not hide the others.
  const probe = async (label: string, fn: () => Promise<unknown>) => {
    try {
      out[label] = { ok: true, data: await fn() };
    } catch (e) {
      out[label] = { ok: false, error: (e as Error).message };
    }
  };

  await probe('me_viaProfileHost', () => snapProfileGet(token, '/me'));
  await probe('me_viaAdsHost', () => snapGet(token, '/me'));
  await probe('organizations', () => snapProfileGet(token, '/me/organizations'));

  // /me on the ads host already carries organization_id — no /me/organizations needed.
  const meAds = out.me_viaAdsHost as { ok: boolean; data?: any } | undefined;
  const orgId = meAds?.ok ? meAds.data?.me?.organization_id : undefined;
  out.organizationId = orgId ?? null;

  if (orgId) {
    // Which host/path actually serves public profiles for this token?
    await probe('ads_organization', () => snapGet(token, `/organizations/${orgId}`));
    await probe('ads_publicProfiles', () => snapGet(token, `/organizations/${orgId}/public_profiles`));
    await probe('business_publicProfiles', () => snapProfileGet(token, `/organizations/${orgId}/public_profiles`));
    await probe('ads_adaccounts', () => snapGet(token, `/organizations/${orgId}/adaccounts`));
  }

  return NextResponse.json(out);
}
