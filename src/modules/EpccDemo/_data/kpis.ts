// Command Center aggregate KPIs + 8-month trend series (mock).
export interface IKpi {
  key: string;
  label: string;
  value: string;
  delta: number; // % change vs last period (can be negative)
}

export const KPIS: IKpi[] = [
  { key: 'followers', label: 'Total followers', value: '767.1K', delta: 4.8 },
  { key: 'reach', label: 'Monthly reach', value: '2.41M', delta: 11.2 },
  { key: 'engagement', label: 'Avg. engagement', value: '4.9%', delta: 0.6 },
  { key: 'scheduled', label: 'Scheduled posts', value: '34', delta: 9.0 },
  { key: 'mentions', label: 'Brand mentions', value: '1,920', delta: -2.3 },
  { key: 'sentiment', label: 'Positive sentiment', value: '72%', delta: 3.4 },
];

export interface ITrendPoint {
  month: string;
  reach: number;
  engagement: number;
}

export const TREND: ITrendPoint[] = [
  { month: 'Nov', reach: 1.6, engagement: 3.9 },
  { month: 'Dec', reach: 1.8, engagement: 4.1 },
  { month: 'Jan', reach: 1.7, engagement: 4.0 },
  { month: 'Feb', reach: 1.9, engagement: 4.3 },
  { month: 'Mar', reach: 2.0, engagement: 4.5 },
  { month: 'Apr', reach: 2.2, engagement: 4.6 },
  { month: 'May', reach: 2.3, engagement: 4.8 },
  { month: 'Jun', reach: 2.41, engagement: 4.9 },
];

// Followers split by platform — for the donut/bar on the command center.
export const FOLLOWERS_BY_PLATFORM = [
  { name: 'Facebook', value: 211500 },
  { name: 'X', value: 184200 },
  { name: 'Instagram', value: 142800 },
  { name: 'LinkedIn', value: 96400 },
  { name: 'TikTok', value: 73900 },
  { name: 'Snapchat', value: 58300 },
];
