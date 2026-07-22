// Snapchat Public Profile / Marketing API constants.
export const SNAP_API = 'https://adsapi.snapchat.com';
export const SNAP_OAUTH = 'https://accounts.snapchat.com';
export const SNAP_API_VERSION = 'v1';

// The Public Profile API lives on businessapi.snapchat.com, NOT the ads host.
// https://developers.snap.com/api/marketing-api/Public-Profile-API/GetStarted
export const SNAP_PROFILE_API = 'https://businessapi.snapchat.com';

// Snapchat requires a SPACE-separated scope list — a comma is not a separator,
// it becomes part of the scope name, and Snapchat then rejects the whole
// authorize request ("Failed to load authorization data"). Earlier attempts to
// add snapchat-profile-api used a comma, so that failure was read as "the app
// isn't allowlisted" when it may only ever have been the separator.
// Accept either form in env and normalise, so the distinction can't bite again.
// https://developers.snap.com/api/marketing-api/Ads-API/authentication
export function normalizeScopes(raw: string): string {
  return raw.split(/[\s,]+/).filter(Boolean).join(' ');
}

// Reading the Public Profile API needs `snapchat-profile-api` (the marketing
// scope alone gets 403). That API is allowlist-gated, so it stays opt-in:
//   SNAPCHAT_SCOPES="snapchat-marketing-api snapchat-profile-api"
export const SNAPCHAT_SCOPES = normalizeScopes(
  process.env.SNAPCHAT_SCOPES || 'snapchat-marketing-api',
);

export type TSnapContentType = 'STORY' | 'SAVED_STORY' | 'SPOTLIGHT';
