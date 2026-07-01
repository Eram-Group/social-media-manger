// LinkedIn REST API constants. Bump LINKEDIN_VERSION (YYYYMM) when LinkedIn
// deprecates it — same maintenance posture as META_GRAPH_VERSION.
export const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202401';
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
