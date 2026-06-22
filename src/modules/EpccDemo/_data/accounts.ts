import { TPlatformId } from './platforms';

// Connected social accounts for the Eastern Province Chamber of Commerce.
export type TAccountStatus = 'connected' | 'attention' | 'syncing' | 'disconnected';

export interface IConnectedAccount {
  platform: TPlatformId;
  handle: string;
  status: TAccountStatus;
  followers: number;
  engagementRate: number; // %
  reach: number; // monthly
  posts: number; // this month
  growth: number; // % follower growth this month
  lastSync: string;
}

export const ACCOUNTS: IConnectedAccount[] = [
  { platform: 'x', handle: '@EP_Chamber', status: 'connected', followers: 184200, engagementRate: 3.1, reach: 612000, posts: 38, growth: 2.4, lastSync: '4 min ago' },
  { platform: 'instagram', handle: '@ep.chamber', status: 'connected', followers: 142800, engagementRate: 5.4, reach: 498000, posts: 27, growth: 4.1, lastSync: '6 min ago' },
  { platform: 'linkedin', handle: 'Eastern Province Chamber', status: 'connected', followers: 96400, engagementRate: 4.2, reach: 311000, posts: 19, growth: 3.0, lastSync: '11 min ago' },
  { platform: 'facebook', handle: 'Eastern Province Chamber', status: 'attention', followers: 211500, engagementRate: 2.6, reach: 540000, posts: 22, growth: -0.8, lastSync: '2 hours ago' },
  { platform: 'tiktok', handle: '@epchamber', status: 'connected', followers: 73900, engagementRate: 7.8, reach: 421000, posts: 16, growth: 9.2, lastSync: '9 min ago' },
  { platform: 'snapchat', handle: '@epchamber', status: 'syncing', followers: 58300, engagementRate: 6.1, reach: 240000, posts: 14, growth: 5.0, lastSync: 'syncing…' },
];
// Totals are consistent: followers sum to 767.1K and avg engagement to ~4.9%,
// matching the Command Center KPIs and the per-platform charts.

// Platforms the Chamber could still add (shown in "Add a connector").
export const AVAILABLE_PLATFORMS: TPlatformId[] = [];
