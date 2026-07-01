// LinkedIn REST API constants. Bump LINKEDIN_VERSION (YYYYMM) when LinkedIn
// deprecates it — same maintenance posture as META_GRAPH_VERSION.
// LinkedIn retires versions ~1 year after release; keep this on a current one
// (latest as of this writing: 202606). A deprecated value returns 426 NONEXISTENT_VERSION.
export const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202606';
export const LI_REST = 'https://api.linkedin.com/rest';
export const LI_OAUTH = 'https://www.linkedin.com/oauth/v2';

// Org-page posting + read-back + follower stats, plus the user identity scopes.
export const LINKEDIN_SCOPES = [
  'w_organization_social',
  'r_organization_social',
  'rw_organization_admin',
  'openid',
  'profile',
].join(' ');

// INTERIM / DEV mode. When LINKEDIN_IDENTITY_ONLY=true, the connect flow skips the
// org (Company Page) scopes and connects the authenticating MEMBER instead —
// requesting identity scopes plus `w_member_social` so the app can publish to the
// member's PERSONAL profile. Use this before the Community Management API product
// is approved (which unlocks Company-Page posting). Unset it (default) for the
// full org-posting flow.
export const LINKEDIN_IDENTITY_ONLY = process.env.LINKEDIN_IDENTITY_ONLY === 'true';
// Member scopes. Override with LINKEDIN_IDENTITY_SCOPES when the app doesn't yet
// have every product: connecting/returning the profile only needs
// `openid profile email` (Sign In with OpenID Connect); publishing needs
// `w_member_social` (Share on LinkedIn) — add that product, then include it here.
export const LINKEDIN_IDENTITY_SCOPES =
  process.env.LINKEDIN_IDENTITY_SCOPES || 'openid profile email w_member_social';

// When LINKEDIN_DRAFT=true, posts are created as DRAFT (lifecycleState=DRAFT) —
// saved to the author's LinkedIn drafts instead of published to the feed. Useful
// for testing the flow without posting publicly. (Still requires w_member_social.)
export const LINKEDIN_DRAFT = process.env.LINKEDIN_DRAFT === 'true';
