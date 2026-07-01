import { TPlatformId } from '@/mock-server/platforms';

// One contract, many implementations. Each social network implements this so the
// rest of the app (publish endpoint, scheduler, UI) stays platform-agnostic — it
// mirrors the TPlatformId / IPost shapes the demo already uses.

// A social account the app has been authorized to act on (a Facebook Page, an
// Instagram business account, …). `accessToken` is a long-lived token; in
// production it must be stored ENCRYPTED at rest (DB), never returned to a browser.
export interface ConnectedAccount {
  platform: TPlatformId;
  accountId: string;            // page id / IG user id
  name?: string;                // display name / handle
  accessToken: string;          // page/long-lived token used to publish
  tokenExpiresAt?: number | null; // unix seconds, or null if effectively permanent
  followers?: number;           // follower/fan count when the platform exposes it
  connectedAt?: number;         // unix seconds when authorized
  meta?: Record<string, unknown>; // platform-specific extras (e.g. linked IG id)
}

// What we want to publish. A connector adapts this to its platform's API.
export type TPublishFormat = 'post' | 'reel' | 'story' | 'video';

export interface PublishInput {
  message?: string;             // caption / text body
  format?: TPublishFormat;      // how to publish it (feed post, reel, story, video)
  imageUrl?: string;            // public URL of an image to attach
  imageUrls?: string[];          // multiple public image URLs (multi-image post)
  imageBlob?: Blob;             // raw image bytes (uploaded directly, no public URL needed)
  videoUrl?: string;            // public URL of a video
  videoBlob?: Blob;             // raw video bytes (uploaded directly)
  link?: string;               // optional link (text posts)
  scheduledPublishTime?: number; // unix seconds; if set + supported, schedule it
}

export interface PublishResult {
  remoteId: string;             // the id of the created post on the platform
  url?: string;                 // permalink, when we can build one
  raw?: unknown;                // raw API response for debugging
}

export interface SocialConnector {
  id: TPlatformId;

  // Validate this connector's required env config; throws a user-facing error if missing.
  assertConfigured?(): void;

  // 1. OAuth — where to send the user to authorize.
  getAuthUrl(state: string): string;
  // Exchange the OAuth `code` from the callback for one or more connectable
  // accounts (a Facebook login can expose several Pages / IG accounts).
  exchangeCode(code: string): Promise<ConnectedAccount[]>;

  // 2. Publishing.
  publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult>;

  // 3. Read-back (optional, added later for Reports/analytics).
  getMetrics?(account: ConnectedAccount, remoteId: string): Promise<Record<string, number>>;

  // 4. Delete a published post from the platform.
  deletePost?(account: ConnectedAccount, remoteId: string): Promise<void>;
}
