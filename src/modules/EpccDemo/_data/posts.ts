import { TPlatformId } from './platforms';

export type TPostStatus = 'scheduled' | 'published' | 'draft';
export type TPostType = 'post' | 'campaign' | 'reminder';
export type TPostFormat = 'post' | 'reel' | 'story' | 'video';

// Platform-specific composer fields — each network has its own extra options on
// top of the shared caption (X threads, IG first comment/location, TikTok sound…).
export interface IPlatformField {
  id: string;
  label: string;
  type: 'text' | 'toggle' | 'select';
  options?: string[];
  placeholder?: string;
}

export const PLATFORM_FIELDS: Record<TPlatformId, IPlatformField[]> = {
  x: [
    { id: 'thread', label: 'Post as a thread', type: 'toggle' },
    { id: 'reply', label: 'Who can reply', type: 'select', options: ['Everyone', 'Accounts you follow', 'Verified only'] },
  ],
  instagram: [
    { id: 'firstComment', label: 'First comment', type: 'text', placeholder: 'Hashtags or link' },
    { id: 'location', label: 'Location', type: 'text', placeholder: 'Add a location' },
    { id: 'collaborator', label: 'Invite collaborator', type: 'text', placeholder: '@handle' },
  ],
  linkedin: [
    { id: 'audience', label: 'Audience', type: 'select', options: ['Anyone', 'Connections only'] },
    { id: 'document', label: 'Attach as document (PDF)', type: 'toggle' },
  ],
  facebook: [
    { id: 'location', label: 'Location', type: 'text', placeholder: 'Add a location' },
    { id: 'feeling', label: 'Feeling / activity', type: 'text', placeholder: 'e.g. celebrating' },
  ],
  snapchat: [
    { id: 'link', label: 'Attach link', type: 'text', placeholder: 'https://…' },
    { id: 'audience', label: 'Audience', type: 'select', options: ['Public', 'Friends'] },
  ],
  tiktok: [
    { id: 'sound', label: 'Sound name', type: 'text', placeholder: 'Original sound — EP Chamber' },
    { id: 'duet', label: 'Allow Duet', type: 'toggle' },
    { id: 'stitch', label: 'Allow Stitch', type: 'toggle' },
  ],
};

// Which platforms support each content format (each platform has a base feed but
// different formats — used to adapt previews and flag unsupported targets).
export const FORMAT_SUPPORT: Record<TPostFormat, TPlatformId[]> = {
  post: ['x', 'instagram', 'linkedin', 'facebook', 'snapchat', 'tiktok'],
  reel: ['instagram', 'tiktok', 'facebook'],
  story: ['instagram', 'facebook', 'snapchat'],
  video: ['x', 'instagram', 'linkedin', 'facebook', 'snapchat', 'tiktok'],
};

export interface IPost {
  id: string;
  content: string;
  platforms: TPlatformId[];
  date: string; // ISO date (yyyy-mm-dd)
  time: string; // HH:mm
  status: TPostStatus;
  type: TPostType;
  format?: TPostFormat;
  campaign?: string; // campaign this post belongs to
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  media?: string[]; // image URLs (1 = single image, many = gallery)
  video?: string; // video URL (reels / video posts)
}

const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;
// Small, reliable sample clip (~1MB, 10s) that loads/plays quickly in the demo.
export const SAMPLE_VIDEO = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

// Mock content calendar for the Chamber — posts, campaign items and reminders.
export const POSTS: IPost[] = [
  {
    id: 'p1',
    content: 'Eastern Province Investment Forum 2026 — registration is now open 🎟️\n\nThree days of keynotes, deal-making and sector roundtables in Dhahran. Early-bird passes available now.',
    platforms: ['x', 'linkedin', 'facebook'],
    date: '2026-06-22', time: '09:00', status: 'published', type: 'campaign',
    campaign: 'Investment Forum 2026', reach: 184000, likes: 3120, comments: 240, shares: 410,
    media: [IMG('epcc-forum-1'), IMG('epcc-forum-2'), IMG('epcc-forum-3'), IMG('epcc-forum-4'), IMG('epcc-forum-5')],
  },
  {
    id: 'p2',
    content: 'Behind the scenes at the Chamber SME accelerator demo day 📸',
    platforms: ['instagram', 'tiktok', 'snapchat'],
    date: '2026-06-22', time: '13:30', status: 'published', type: 'post', format: 'reel',
    reach: 96500, likes: 5240, comments: 188, shares: 96,
    video: SAMPLE_VIDEO,
  },
  {
    id: 'p3',
    content: 'Weekly economic brief: non-oil sector growth highlights 📈',
    platforms: ['linkedin', 'x'],
    date: '2026-06-23', time: '10:00', status: 'scheduled', type: 'post',
  },
  {
    id: 'p4',
    content: 'Member spotlight: meet the founders shaping Dammam’s tech scene',
    platforms: ['instagram', 'facebook'],
    date: '2026-06-24', time: '17:00', status: 'scheduled', type: 'campaign',
    campaign: 'Member Spotlight',
  },
  {
    id: 'r1',
    content: 'Reminder: approve the Q3 content plan with the comms team',
    platforms: [],
    date: '2026-06-24', time: '11:00', status: 'scheduled', type: 'reminder',
  },
  {
    id: 'p5',
    content: 'Reminder: the women-in-business networking session is tomorrow 🤝',
    platforms: ['x', 'instagram', 'linkedin', 'facebook'],
    date: '2026-06-25', time: '08:30', status: 'scheduled', type: 'campaign',
    campaign: 'Women in Business',
  },
  {
    id: 'p6',
    content: 'Quick poll: which workshop topic should we host next quarter?',
    platforms: ['x', 'snapchat'],
    date: '2026-06-26', time: '12:00', status: 'draft', type: 'post',
  },
  {
    id: 'p7',
    content: 'Highlights reel from the Logistics & Trade summit 🎬',
    platforms: ['tiktok', 'instagram'],
    date: '2026-06-27', time: '19:00', status: 'scheduled', type: 'campaign',
    campaign: 'Logistics Summit',
  },
  {
    id: 'p8',
    content: 'Thank you to everyone who joined the Vision 2030 economic outlook webinar 🙏\n\nNon-oil sector growth, foreign investment momentum and what it means for Eastern Province businesses.',
    platforms: ['linkedin', 'x', 'facebook'],
    date: '2026-06-21', time: '15:00', status: 'published', type: 'post',
    reach: 142000, likes: 2890, comments: 176, shares: 320,
    media: [IMG('epcc-webinar')],
  },
  {
    id: 'p9',
    content: 'New member onboarding made simple — watch our 60-second guide 🎥',
    platforms: ['instagram', 'tiktok'],
    date: '2026-06-20', time: '18:00', status: 'published', type: 'post', format: 'reel',
    reach: 88000, likes: 6100, comments: 210, shares: 144,
    video: SAMPLE_VIDEO,
  },
];

export interface IPostAnalytics {
  published: boolean;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  profileVisits: number;
  follows: number;
  videoViews: number;
  avgWatch: string;
  engagementRate: number; // %
  perPlatform: { platform: TPlatformId; reach: number; engagement: number }[];
  reachCurve: { day: string; reach: number; impressions: number }[];
  trafficSources: { name: string; value: number }[];
  age: { label: string; value: number }[];
  gender: { label: string; value: number }[];
  hourly: { hour: string; engagements: number }[];
  topHour: string;
}

// Deterministic per-post analytics derived from the post's headline numbers.
export function getPostAnalytics(post: IPost): IPostAnalytics {
  const empty: IPostAnalytics = {
    published: false, reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0,
    profileVisits: 0, follows: 0, videoViews: 0, avgWatch: '0:00', engagementRate: 0,
    perPlatform: [], reachCurve: [], trafficSources: [], age: [], gender: [], hourly: [], topHour: '—',
  };
  if (post.status !== 'published' || !post.reach) return empty;

  const likes = post.likes ?? 0;
  const comments = post.comments ?? 0;
  const shares = post.shares ?? 0;
  const reach = post.reach;
  const impressions = Math.round(reach * 1.9);
  const engagementRate = Number((((likes + comments + shares) / reach) * 100).toFixed(1));

  const weights = post.platforms.map((_, i) => 1 / (i + 1.5));
  const wsum = weights.reduce((s, w) => s + w, 0) || 1;
  const perPlatform = post.platforms.map((platform, i) => ({
    platform,
    reach: Math.round((reach * weights[i]) / wsum),
    engagement: Number((engagementRate * (0.8 + ((i * 7) % 5) / 10)).toFixed(1)),
  }));

  // 14-day reach + impressions curve (front-loaded).
  const reachCurve = Array.from({ length: 14 }, (_, i) => {
    const factor = i < 3 ? (i + 1) / 3 : Math.max(0.12, 1 - (i - 2) * 0.09);
    return { day: `D${i + 1}`, reach: Math.round((reach / 5.2) * factor), impressions: Math.round((impressions / 5.2) * factor) };
  });

  const trafficSources = [
    { name: 'Home feed', value: Math.round(reach * 0.46) },
    { name: 'Explore / FYP', value: Math.round(reach * 0.27) },
    { name: 'Hashtags', value: Math.round(reach * 0.14) },
    { name: 'Profile', value: Math.round(reach * 0.08) },
    { name: 'Other', value: Math.round(reach * 0.05) },
  ];

  // Audience skews younger when the post runs on TikTok/Instagram.
  const young = post.platforms.some((p) => p === 'tiktok' || p === 'instagram');
  const age = young
    ? [{ label: '18–24', value: 31 }, { label: '25–34', value: 39 }, { label: '35–44', value: 18 }, { label: '45–54', value: 8 }, { label: '55+', value: 4 }]
    : [{ label: '18–24', value: 12 }, { label: '25–34', value: 34 }, { label: '35–44', value: 29 }, { label: '45–54', value: 17 }, { label: '55+', value: 8 }];
  const gender = young
    ? [{ label: 'Male', value: 48 }, { label: 'Female', value: 52 }]
    : [{ label: 'Male', value: 58 }, { label: 'Female', value: 42 }];

  // Engagement across the first 24h (every 2h), peaking in the evening.
  const totalEng = likes + comments + shares;
  const hourly = Array.from({ length: 12 }, (_, i) => {
    const peak = Math.exp(-Math.pow(i - 8.5, 2) / 6); // ~17:00 peak
    return { hour: `${(i * 2).toString().padStart(2, '0')}:00`, engagements: Math.round((totalEng / 9) * (0.35 + peak)) };
  });
  const topHour = hourly.reduce((m, h) => (h.engagements > m.engagements ? h : m), hourly[0]).hour;

  return {
    published: true,
    reach,
    impressions,
    likes,
    comments,
    shares,
    saves: Math.round(likes * 0.12),
    clicks: Math.round(reach * 0.04),
    profileVisits: Math.round(reach * 0.08),
    follows: Math.round(reach * 0.012),
    videoViews: Math.round(reach * 1.25),
    avgWatch: '0:12',
    engagementRate,
    perPlatform,
    reachCurve,
    trafficSources,
    age,
    gender,
    hourly,
    topHour,
  };
}
