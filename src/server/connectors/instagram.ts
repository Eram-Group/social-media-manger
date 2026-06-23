// Instagram connector (via Facebook Login + a Page-linked IG Business account).
// Publishing is a two-step Graph API call: create a media container, then publish it.
// Requirements: the IG account must be a Business/Creator account linked to the
// Facebook Page; permissions are granted at OAuth (see SCOPES below).
//
// NOTE on scopes: Meta has two IG paths with different scope names. This connector
// uses the Facebook-Login + Pages path. If your app is set up with the newer
// "Instagram API with Instagram Login", set META_INSTAGRAM_SCOPES in env to
// "instagram_business_basic,instagram_business_content_publish".
import { redirectUri } from '@/server/env';
import { ConnectedAccount, PublishInput, PublishResult, SocialConnector } from './types';
import { buildAuthUrl, codeToPages, graphGet, graphPost } from './meta';

const DEFAULT_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
];

function scopes(): string[] {
  const fromEnv = process.env.META_INSTAGRAM_SCOPES;
  return fromEnv ? fromEnv.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_SCOPES;
}

export const instagramConnector: SocialConnector = {
  id: 'instagram',

  getAuthUrl(state: string): string {
    return buildAuthUrl(redirectUri('instagram'), scopes(), state);
  },

  async exchangeCode(code: string): Promise<ConnectedAccount[]> {
    const pages = await codeToPages(code, redirectUri('instagram'));
    const accounts: ConnectedAccount[] = [];
    for (const page of pages) {
      // Find the IG Business account linked to this Page.
      const info = await graphGet<{ instagram_business_account?: { id: string; username?: string; followers_count?: number } }>(
        page.id,
        { access_token: page.access_token, fields: 'instagram_business_account{id,username,followers_count}' },
      );
      const ig = info.instagram_business_account;
      if (!ig) continue;
      accounts.push({
        platform: 'instagram',
        accountId: ig.id,
        name: ig.username ? `@${ig.username}` : page.name,
        accessToken: page.access_token, // the Page token is used for IG Graph calls
        tokenExpiresAt: null,
        followers: ig.followers_count,
        meta: { pageId: page.id },
      });
    }
    return accounts;
  },

  async publish(account: ConnectedAccount, input: PublishInput): Promise<PublishResult> {
    if (!input.imageUrl) {
      throw new Error('Instagram requires an image (or video). A caption alone is not allowed.');
    }
    // 1. Create a media container.
    const container = await graphPost<{ id: string }>(`${account.accountId}/media`, {
      image_url: input.imageUrl,
      caption: input.message ?? '',
      access_token: account.accessToken,
    });
    // 2. Publish the container.
    const res = await graphPost<{ id: string }>(`${account.accountId}/media_publish`, {
      creation_id: container.id,
      access_token: account.accessToken,
    });
    return { remoteId: res.id, raw: res };
  },
};
