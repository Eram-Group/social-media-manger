// Snapchat Public Profile / Marketing API constants.
export const SNAP_API = 'https://adsapi.snapchat.com';
export const SNAP_OAUTH = 'https://accounts.snapchat.com';
export const SNAP_API_VERSION = 'v1';

// The Public Profile API lives on businessapi.snapchat.com, NOT the ads host.
// https://developers.snap.com/api/marketing-api/Public-Profile-API/GetStarted
export const SNAP_PROFILE_API = 'https://businessapi.snapchat.com';

// Scopes are SPACE-separated — a comma is not a separator, it becomes part of
// the scope name and Snapchat then rejects the whole authorize request with
// "Failed to load authorization data". Earlier attempts to add
// snapchat-profile-api used a comma, so that failure was read as "the app isn't
// allowlisted" when it may only ever have been the separator.
// https://developers.snap.com/api/marketing-api/Ads-API/authentication
//
// `snapchat-profile-api` is required to read the Public Profile API — with the
// marketing scope alone, /organizations/{id}/public_profiles returns 403.
// Hardcoded rather than env-driven so it applies everywhere without extra
// config. Note this API is allowlist-gated: if Snap has not allowlisted the
// client ID, requesting the scope breaks the authorize page outright instead of
// degrading, and backing it out needs a redeploy.
export const SNAPCHAT_SCOPES = 'snapchat-marketing-api snapchat-profile-api';

export type TSnapContentType = 'STORY' | 'SAVED_STORY' | 'SPOTLIGHT';
