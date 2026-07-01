// Facebook Page connector. Publishes to a Page via the Graph API.
// Permissions required (granted at OAuth): pages_show_list, pages_read_engagement,
// pages_manage_posts. While the Meta app is in Development Mode you can publish to
// Pages you administer without App Review.
import { redirectUri, assertMetaConfigured } from '@/server/env';
import { ConnectedAccount, PublishInput, PublishResult, SocialConnector } from './types';
import { buildAuthUrl, codeToUserToken, discoverPages, graphPost, graphPostForm, graphGet, graphDelete, ruploadBytes } from './meta';

// Publish a Reel (vertical video) via the 3-step video_reels flow.
async function publishReel(pageId: string, token: string, video: Blob, description?: string): Promise<PublishResult> {
  const start = await graphPost<{ video_id: string; upload_url: string }>(`${pageId}/video_reels`, {
    upload_phase: 'start',
    access_token: token,
  });
  await ruploadBytes(start.upload_url, token, await video.arrayBuffer());
  const finish = await graphPost<{ success?: boolean; post_id?: string }>(`${pageId}/video_reels`, {
    access_token: token,
    upload_phase: 'finish',
    video_id: start.video_id,
    video_state: 'PUBLISHED',
    ...(description ? { description } : {}),
  });
  const remoteId = finish.post_id || start.video_id;
  return { remoteId, url: `https://www.facebook.com/${remoteId}`, raw: finish };
}

// Publish a photo Story: upload an unpublished photo, then attach it as a story.
async function publishPhotoStory(pageId: string, token: string, photo: Blob): Promise<PublishResult> {
  const form = new FormData();
  form.append('source', photo, 'story.jpg');
  form.append('published', 'false');
  form.append('access_token', token);
  const up = await graphPostForm<{ id: string }>(`${pageId}/photos`, form);
  const story = await graphPost<{ post_id?: string; success?: boolean }>(`${pageId}/photo_stories`, {
    photo_id: up.id,
    access_token: token,
  });
  const remoteId = story.post_id || up.id;
  return { remoteId, url: `https://www.facebook.com/${remoteId}`, raw: story };
}

// Publish a video Story via the video_stories flow.
async function publishVideoStory(pageId: string, token: string, video: Blob): Promise<PublishResult> {
  const start = await graphPost<{ video_id: string; upload_url: string }>(`${pageId}/video_stories`, {
    upload_phase: 'start',
    access_token: token,
  });
  await ruploadBytes(start.upload_url, token, await video.arrayBuffer());
  const finish = await graphPost<{ post_id?: string; success?: boolean }>(`${pageId}/video_stories`, {
    access_token: token,
    upload_phase: 'finish',
    video_id: start.video_id,
  });
  const remoteId = finish.post_id || start.video_id;
  return { remoteId, url: `https://www.facebook.com/${remoteId}`, raw: finish };
}

// business_management lets us reach Pages owned via a Business / New Pages Experience
// (which don't appear on the personal /me/accounts edge).
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content', 'pages_manage_posts', 'pages_manage_engagement', 'read_insights', 'business_management'];

export const facebookConnector: SocialConnector = {
  id: 'facebook',
  assertConfigured: assertMetaConfigured,

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
    const fmt = input.format ?? 'post';
    const page = account.accountId;
    const token = account.accessToken;

    // Fetch a hosted URL into raw bytes when the composer provides a URL instead
    // of a Blob (reels/stories need the bytes for the resumable upload).
    const fetchBlob = async (url?: string): Promise<Blob | null> => {
      if (!url) return null;
      try { return await fetch(url).then((r) => r.blob()); } catch { return null; }
    };

    // Reel — requires a video.
    if (fmt === 'reel') {
      const vid = input.videoBlob ?? (await fetchBlob(input.videoUrl));
      if (!vid) throw new Error('A Reel needs a (vertical) video. Upload a video and try again.');
      return publishReel(page, token, vid, input.message);
    }

    // Story — photo or video story.
    if (fmt === 'story') {
      const vid = input.videoBlob ?? (await fetchBlob(input.videoUrl));
      if (vid) return publishVideoStory(page, token, vid);
      const img = input.imageBlob ?? (await fetchBlob(input.imageUrl));
      if (img) return publishPhotoStory(page, token, img);
      throw new Error('A Story needs an image or video. Upload media and try again.');
    }

    // Video / reel / story -> /{page-id}/videos (the text becomes the description).
    if (input.videoBlob || input.videoUrl) {
      const form = new FormData();
      if (input.videoBlob) form.append('source', input.videoBlob, 'upload.mp4');
      else if (input.videoUrl) form.append('file_url', input.videoUrl);
      if (input.message) form.append('description', input.message);
      form.append('access_token', account.accessToken);
      if (scheduling) {
        form.append('published', 'false');
        form.append('scheduled_publish_time', String(input.scheduledPublishTime));
      }
      const res = await graphPostForm<{ id: string }>(`${account.accountId}/videos`, form);
      return { remoteId: res.id, url: `https://www.facebook.com/${res.id}`, raw: res };
    }

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

  async deletePost(account: ConnectedAccount, remoteId: string): Promise<void> {
    await graphDelete(remoteId, { access_token: account.accessToken });
  },
};
