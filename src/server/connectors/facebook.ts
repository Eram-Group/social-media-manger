// Facebook Page connector. Publishes to a Page via the Graph API.
// Permissions required (granted at OAuth): pages_show_list, pages_read_engagement,
// pages_manage_posts. While the Meta app is in Development Mode you can publish to
// Pages you administer without App Review.
import { redirectUri } from '@/server/env';
import { ConnectedAccount, PublishInput, PublishResult, SocialConnector } from './types';
import { buildAuthUrl, codeToUserToken, discoverPages, graphPost, graphPostForm } from './meta';

// business_management lets us reach Pages owned via a Business / New Pages Experience
// (which don't appear on the personal /me/accounts edge).
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management'];

export const facebookConnector: SocialConnector = {
  id: 'facebook',

  getAuthUrl(state: string): string {
    return buildAuthUrl(redirectUri('facebook'), SCOPES, state);
  },

  async exchangeCode(code: string): Promise<ConnectedAccount[]> {
    const userToken = await codeToUserToken(code, redirectUri('facebook'));
    const pages = await discoverPages(userToken);
    return pages.map((p) => ({
      platform: 'facebook' as const,
      accountId: p.id,
      name: p.name,
      accessToken: p.access_token,
      tokenExpiresAt: null, // Page tokens from a long-lived user token don't expire
      followers: p.followers_count ?? p.fan_count,
    }));
  },

  async publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult> {
    const scheduling = typeof input.scheduledPublishTime === 'number';

    // Photo post from raw bytes -> upload directly via multipart `source`
    // (no public URL needed — handles local uploads from the composer).
    if (input.imageBlob) {
      const form = new FormData();
      form.append('source', input.imageBlob, 'upload.jpg');
      if (input.message) form.append('caption', input.message);
      form.append('access_token', account.accessToken);
      if (scheduling) {
        form.append('published', 'false');
        form.append('scheduled_publish_time', String(input.scheduledPublishTime));
      }
      const res = await graphPostForm<{ id: string; post_id?: string }>(`${account.accountId}/photos`, form);
      const remoteId = res.post_id || res.id;
      return { remoteId, url: `https://www.facebook.com/${remoteId}`, raw: res };
    }

    // Photo post by public URL -> /{page-id}/photos ; text/link post -> /{page-id}/feed
    if (input.imageUrl) {
      const body: Record<string, string> = {
        url: input.imageUrl,
        access_token: account.accessToken,
      };
      if (input.message) body.caption = input.message;
      if (scheduling) {
        body.published = 'false';
        body.scheduled_publish_time = String(input.scheduledPublishTime);
      }
      const res = await graphPost<{ id: string; post_id?: string }>(`${account.accountId}/photos`, body);
      const remoteId = res.post_id || res.id;
      return { remoteId, url: `https://www.facebook.com/${remoteId}`, raw: res };
    }

    const body: Record<string, string> = {
      message: input.message ?? '',
      access_token: account.accessToken,
    };
    if (input.link) body.link = input.link;
    if (scheduling) {
      body.published = 'false';
      body.scheduled_publish_time = String(input.scheduledPublishTime);
    }
    const res = await graphPost<{ id: string }>(`${account.accountId}/feed`, body);
    return { remoteId: res.id, url: `https://www.facebook.com/${res.id}`, raw: res };
  },
};
