// Server-only configuration. These are read from process.env and MUST NOT be
// prefixed NEXT_PUBLIC_ (that would ship them to the browser). Import this only
// from server code (API route handlers, connectors) — never from a client component.
import { TPlatformId } from '@/mock-server/platforms';

export const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

export const META = {
  appId: process.env.META_APP_ID || '',
  appSecret: process.env.META_APP_SECRET || '',
  // Graph API version. Bump this if Meta deprecates the default. Override with
  // META_GRAPH_VERSION in env.
  graphVersion: process.env.META_GRAPH_VERSION || 'v22.0',
};

export const LINKEDIN = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
};

// The OAuth redirect URI for a platform. This EXACT string must be added to the
// Meta app's "Valid OAuth Redirect URIs" list.
export function redirectUri(platform: TPlatformId): string {
  return `${APP_BASE_URL}/api/connect/${platform}/callback`;
}

export function assertMetaConfigured(): void {
  if (!META.appId || !META.appSecret) {
    throw new Error(
      'Meta is not configured. Set META_APP_ID and META_APP_SECRET in your .env / .env.local.',
    );
  }
}

export function assertLinkedInConfigured(): void {
  if (!LINKEDIN.clientId || !LINKEDIN.clientSecret) {
    throw new Error(
      'LinkedIn is not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your .env / .env.local.',
    );
  }
}
