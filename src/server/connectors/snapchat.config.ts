// Snapchat Public Profile / Marketing API constants.
export const SNAP_API = 'https://adsapi.snapchat.com';
export const SNAP_OAUTH = 'https://accounts.snapchat.com';
export const SNAP_API_VERSION = 'v1';

// The Public Profile API lives on businessapi.snapchat.com, NOT the ads host.
// https://developers.snap.com/api/marketing-api/Public-Profile-API/GetStarted
export const SNAP_PROFILE_API = 'https://businessapi.snapchat.com';

// Public Profile API requires `snapchat-profile-api`; the marketing scope alone
// returns permission errors on /organizations/{id}/public_profiles.
// NOTE: this API is ALLOWLIST ONLY — the OAuth client ID must be allowlisted by
// a Snap contact before any of these calls succeed, whatever the scopes say.
export const SNAPCHAT_SCOPES = 'snapchat-marketing-api,snapchat-profile-api';

export type TSnapContentType = 'STORY' | 'SAVED_STORY' | 'SPOTLIGHT';
