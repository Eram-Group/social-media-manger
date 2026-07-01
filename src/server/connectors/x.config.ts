// X (Twitter) API v2 constants. OAuth 2.0 Authorization Code + PKCE.
// VERIFY endpoint hosts/paths + field names against the live X API v2 docs during
// paid-tier testing (X moved twitter.com → x.com and api.twitter.com → api.x.com).
export const X_API = 'https://api.x.com/2';
export const X_AUTH = 'https://x.com/i/oauth2/authorize';
export const X_TOKEN = 'https://api.x.com/2/oauth2/token';

// Media upload (chunked INIT/APPEND/FINALIZE). VERIFY: newer v2 host is
// api.x.com/2/media/upload; the legacy host was upload.twitter.com/1.1/media/upload.json.
export const X_UPLOAD = 'https://api.x.com/2/media/upload';

// tweet.write → publish; users.read → /users/me; offline.access → refresh token.
export const X_SCOPES = 'tweet.read tweet.write users.read offline.access';

// Native limits used to guard media selection before hitting the API.
export const X_MAX_IMAGES = 4; // up to 4 images OR 1 video per tweet
