import { TPlatformId } from './platforms';

export interface IReportBreakdown {
  platform: TPlatformId;
  reach: string;
  engagement: string;
  posts: number;
}

export interface IReportTopPost {
  content: string;
  platforms: TPlatformId[];
  reach: string;
}

// Saved weekly/monthly reports (mock) for the Reports screen.
export interface IReport {
  id: string;
  title: string;
  period: 'Weekly' | 'Monthly';
  range: string;
  posts: number;
  reach: string;
  engagement: string;
  topPlatform: string;
  followerGrowth: string;
  status: 'ready' | 'generating';
  breakdown: IReportBreakdown[];
  topPosts: IReportTopPost[];
  summary: string;
}

const fullBreakdown: IReportBreakdown[] = [
  { platform: 'facebook', reach: '540K', engagement: '2.6%', posts: 22 },
  { platform: 'x', reach: '612K', engagement: '3.1%', posts: 38 },
  { platform: 'instagram', reach: '498K', engagement: '5.4%', posts: 27 },
  { platform: 'linkedin', reach: '311K', engagement: '4.2%', posts: 19 },
  { platform: 'tiktok', reach: '421K', engagement: '7.8%', posts: 16 },
  { platform: 'snapchat', reach: '240K', engagement: '6.1%', posts: 14 },
];

const topPosts: IReportTopPost[] = [
  { content: 'Investment Forum 2026 registration is open 🎟️', platforms: ['x', 'linkedin', 'facebook'], reach: '184K' },
  { content: 'SME accelerator demo day — behind the scenes 📸', platforms: ['instagram', 'tiktok'], reach: '96K' },
  { content: 'Logistics & Trade summit highlights reel 🎬', platforms: ['tiktok', 'instagram'], reach: '78K' },
];

export const REPORTS: IReport[] = [
  {
    id: 'r1', title: 'June 2026 — Monthly Performance', period: 'Monthly', range: '1–30 Jun 2026',
    posts: 136, reach: '2.41M', engagement: '4.9%', topPlatform: 'Instagram', followerGrowth: '+4.8%',
    status: 'ready', breakdown: fullBreakdown, topPosts,
    summary: 'Strong month driven by the Investment Forum campaign and short-form video. TikTok and Instagram led engagement; Facebook reach dipped slightly and needs attention.',
  },
  {
    id: 'r2', title: 'Week 25 — Weekly Summary', period: 'Weekly', range: '16–22 Jun 2026',
    posts: 31, reach: '612K', engagement: '5.2%', topPlatform: 'TikTok', followerGrowth: '+1.2%',
    status: 'ready', breakdown: fullBreakdown.slice(0, 5), topPosts: topPosts.slice(0, 2),
    summary: 'Short-form video outperformed static posts by 38%. Carry this format into Week 26.',
  },
  {
    id: 'r3', title: 'Week 24 — Weekly Summary', period: 'Weekly', range: '9–15 Jun 2026',
    posts: 28, reach: '548K', engagement: '4.7%', topPlatform: 'LinkedIn', followerGrowth: '+0.9%',
    status: 'ready', breakdown: fullBreakdown.slice(0, 5), topPosts: topPosts.slice(0, 2),
    summary: 'LinkedIn economic briefs resonated with the investor segment. Consider a weekly cadence.',
  },
  {
    id: 'r4', title: 'May 2026 — Monthly Performance', period: 'Monthly', range: '1–31 May 2026',
    posts: 128, reach: '2.18M', engagement: '4.6%', topPlatform: 'Facebook', followerGrowth: '+3.1%',
    status: 'ready', breakdown: fullBreakdown, topPosts,
    summary: 'Steady growth; events drove most reach. Opportunity to grow TikTok with more behind-the-scenes content.',
  },
];
