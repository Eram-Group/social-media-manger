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
export const LINKEDIN_IDENTITY_SCOPES = 'openid profile email w_member_social';
