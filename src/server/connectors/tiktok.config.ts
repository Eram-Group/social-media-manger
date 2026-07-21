// TikTok Open Platform API constants.
export const TIKTOK_API = 'https://open.tiktokapis.com/v2';
export const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize';
// Trailing slash is REQUIRED — without it TikTok's gateway returns
// `404 Unsupported path(Janus)`. Same for every /v2 path below.
export const TIKTOK_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';

// Comma-separated per TikTok. VERIFY against the app's granted scopes.
export const TIKTOK_SCOPES = 'user.info.basic,video.upload,video.publish';

export type TTikTokPostType = 'VIDEO' | 'PHOTO';
