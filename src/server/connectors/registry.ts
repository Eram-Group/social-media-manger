import { TPlatformId } from '@/mock-server/platforms';
import { SocialConnector } from './types';
import { facebookConnector } from './facebook';
import { instagramConnector } from './instagram';
import { linkedinConnector } from './linkedin';
import { snapchatConnector } from './snapchat';
import { tiktokConnector } from './tiktok';
import { xConnector } from './x';

// Platform id -> connector. Add LinkedIn, X, TikTok, Snapchat here as they land.
const CONNECTORS: Partial<Record<TPlatformId, SocialConnector>> = {
  facebook: facebookConnector,
  instagram: instagramConnector,
  linkedin: linkedinConnector,
  snapchat: snapchatConnector,
  tiktok: tiktokConnector,
  x: xConnector,
};

export function getConnector(platform: string): SocialConnector {
  const c = CONNECTORS[platform as TPlatformId];
  if (!c) throw new Error(`No connector implemented for "${platform}" yet.`);
  return c;
}

export function isSupported(platform: string): boolean {
  return Boolean(CONNECTORS[platform as TPlatformId]);
}
