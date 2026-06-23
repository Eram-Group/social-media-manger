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
import { buildAuthUrl, codeToUserToken, discoverPages, graphGet, graphPost } from './meta';

const DEFAULT_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  'pages_show_list',
  'pages_read_engagement',
  'read_insights',
  'business_management',
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
    const userToken = await codeToUserToken(code, redirectUri('instagram'));
    const pages = await discoverPages(userToken);
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
    const fmt = input.format ?? 'post';
    const isVideo = Boolean(input.videoUrl);
    if (!input.imageUrl && !input.videoUrl) {
      throw new Error('Instagram requires an image or video (no text-only posts).');
    }

    // Build the media container by format. Instagram needs the media_type set:
    //  - story  -> STORIES (image or video)
    //  - reel / video -> REELS (video only)
    //  - default -> a normal image feed post
    const params: Record<string, string> = { access_token: account.accessToken };
    if (fmt === 'story') {
      params.media_type = 'STORIES';
    } else if (fmt === 'reel' || fmt === 'video') {
      params.media_type = 'REELS';
      if (!isVideo) throw new Error('Instagram Reels require a video.');
    }
    // Stories don't take a caption; everything else does.
    if (input.message && fmt !== 'story') params.caption = input.message;
    if (isVideo) params.video_url = input.videoUrl!;
    else params.image_url = input.imageUrl!;

    const container = await graphPost<{ id: string }>(`${account.accountId}/media`, params);

    // Video containers (reels / video stories) process asynchronously — wait until
    // the container is FINISHED before publishing.
    if (isVideo) {
      let ready = false;
      for (let i = 0; i < 30; i++) {
        const st = await graphGet<{ status_code?: string }>(container.id, {
          access_token: account.accessToken, fields: 'status_code',
        });
        if (st.status_code === 'FINISHED') { ready = true; break; }
        if (st.status_code === 'ERROR') throw new Error('Instagram failed to process the video.');
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!ready) throw new Error('Instagram video is still processing — try publishing again shortly.');
    }

    const res = await graphPost<{ id: string }>(`${account.accountId}/media_publish`, {
      creation_id: container.id,
      access_token: account.accessToken,
    });
    return { remoteId: res.id, raw: res };
  },

  // Instagram's Graph API does not support deleting media — surface that clearly.
  async deletePost(): Promise<void> {
    throw new Error("Instagram doesn't allow deleting posts via the API — remove it from the Instagram app.");
  },
};
