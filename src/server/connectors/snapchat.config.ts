// Snapchat Public Profile / Marketing API constants.
export const SNAP_API = 'https://adsapi.snapchat.com';
export const SNAP_OAUTH = 'https://accounts.snapchat.com';
export const SNAP_API_VERSION = 'v1';

// The Public Profile API lives on businessapi.snapchat.com, NOT the ads host.
// https://developers.snap.com/api/marketing-api/Public-Profile-API/GetStarted
export const SNAP_PROFILE_API = 'https://businessapi.snapchat.com';

// Public Profile API needs `snapchat-profile-api` — but that API is ALLOWLIST
// ONLY, and Snapchat refuses the whole authorize request ("Failed to load
// authorization data") when an app asks for a scope it hasn't been granted.
// So default to the marketing scope and opt in via env once Snap has
// allowlisted the client ID:  SNAPCHAT_SCOPES="snapchat-marketing-api,snapchat-profile-api"
export const SNAPCHAT_SCOPES = process.env.SNAPCHAT_SCOPES || 'snapchat-marketing-api';

export type TSnapContentType = 'STORY' | 'SAVED_STORY' | 'SPOTLIGHT';
