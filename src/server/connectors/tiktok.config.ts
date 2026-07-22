// TikTok Open Platform API constants.
export const TIKTOK_API = 'https://open.tiktokapis.com/v2';
export const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize';
// Trailing slash is REQUIRED — without it TikTok's gateway returns
// `404 Unsupported path(Janus)`. Same for every /v2 path below.
export const TIKTOK_TOKEN = 'https://open.tiktokapis.com/v2/oauth/token/';

// Comma-separated per TikTok. VERIFY against the app's granted scopes.
// Every scope this connector actually uses:
//   user.info.basic   — open_id, avatar, display_name
//   user.info.profile — username, bio_description, is_verified
//   user.info.stats   — follower_count (Analytics/Reports); WITHOUT this the
//                       follower_count field is silently dropped
//   video.list        — read back posts the account already had (posts/list)
//   video.upload      — media upload
//   video.publish     — direct posting
// Each must ALSO be enabled on the app in the TikTok portal. Adding a scope
// invalidates existing consent — connected accounts must reconnect.
export const TIKTOK_SCOPES = [
  'user.info.basic',
  'user.info.profile',
  'user.info.stats',
  'video.list',
  'video.upload',
  'video.publish',
].join(',');

// Publish-status polling budget. The whole publish call has to finish inside the
// serverless function's maxDuration, so this ceiling must stay well under it —
// the previous 30 x 3s = 90s could not complete on Vercel's default Node limit
// and the request was killed mid-poll. Raise `maxDuration` before raising these.
export const POLL_ATTEMPTS = 8;
export const POLL_INTERVAL_MS = 3000;

export type TTikTokPostType = 'VIDEO' | 'PHOTO';
