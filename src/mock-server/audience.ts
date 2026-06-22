import { TPlatformId, getPlatform, platformChartColor } from './platforms';

// Audience insight fixtures for the Chamber: demographics, interests, sentiment,
// plus rich per-platform behavioural insights (formats, active hours, devices,
// language, retention, hashtags) so each platform tells a distinct story.

export const INTERESTS = [
  'Investment & Finance', 'SME & Entrepreneurship', 'Logistics & Trade',
  'Technology & Innovation', 'Tourism & Events', 'Industrial Manufacturing',
  'Women in Business', 'Vision 2030',
];

export const SENTIMENT_THEMES = [
  { theme: 'Event organisation', score: 'positive', mentions: 412 },
  { theme: 'Response time to members', score: 'neutral', mentions: 188 },
  { theme: 'Digital services', score: 'positive', mentions: 264 },
  { theme: 'Membership fees', score: 'negative', mentions: 96 },
  { theme: 'Networking opportunities', score: 'positive', mentions: 351 },
] as const;

const HOURS = ['6a', '9a', '12p', '3p', '6p', '9p', '12a'];
const activeHours = (vals: number[]) => HOURS.map((hour, i) => ({ hour, value: vals[i] }));

export interface IAudienceView {
  accent: string;
  reach: string;
  growth: string;
  gender: { name: string; value: number }[];
  age: { group: string; value: number }[];
  cities: { city: string; value: number }[];
  sentiment: { positive: number; neutral: number; negative: number };
  // rich insights
  bestTime: string;
  topFormat: string;
  avgWatch: string;
  newVsReturning: { new: number; returning: number };
  device: { mobile: number; desktop: number };
  language: { arabic: number; english: number };
  hashtags: string[];
  activeHours: { hour: string; value: number }[];
  formats: { format: string; value: number }[];
  insight: string;
}

const CITIES = [
  { city: 'Dammam', value: 31 }, { city: 'Al Khobar', value: 24 }, { city: 'Dhahran', value: 18 },
  { city: 'Jubail', value: 12 }, { city: 'Qatif', value: 9 }, { city: 'Other', value: 6 },
];

const AGE = (v: number[]) =>
  ['18–24', '25–34', '35–44', '45–54', '55+'].map((group, i) => ({ group, value: v[i] }));

const sentiment = (pos: number) => ({
  positive: pos,
  neutral: Math.round((100 - pos) * 0.66),
  negative: 100 - pos - Math.round((100 - pos) * 0.66),
});

const gender = (male: number) => [
  { name: 'Male', value: male },
  { name: 'Female', value: 100 - male },
];

const VIEWS: Record<TPlatformId | 'all', IAudienceView> = {
  all: {
    accent: '#025FCC', reach: '2.4M', growth: '+4.8%',
    gender: gender(54), age: AGE([16, 38, 27, 13, 6]), cities: CITIES, sentiment: sentiment(72),
    bestTime: 'Sun–Tue, 8–10 PM', topFormat: 'Short-form video', avgWatch: '0:21',
    newVsReturning: { new: 61, returning: 39 }, device: { mobile: 88, desktop: 12 },
    language: { arabic: 64, english: 36 },
    hashtags: ['#EPChamber', '#Vision2030', '#SME', '#InvestEP', '#EasternProvince'],
    activeHours: activeHours([18, 34, 52, 44, 78, 92, 40]),
    formats: [{ format: 'Video', value: 46 }, { format: 'Image', value: 30 }, { format: 'Carousel', value: 16 }, { format: 'Text', value: 8 }],
    insight: 'Across all platforms the 25–34 segment drives the most engagement, peaking weeknights — lead with short-form video and Vision 2030 angles.',
  },
  x: {
    accent: platformChartColor('x'), reach: '612K', growth: '+2.4%',
    gender: gender(64), age: AGE([14, 36, 30, 14, 6]), cities: CITIES, sentiment: sentiment(68),
    bestTime: 'Weekdays, 7–9 AM', topFormat: 'Threads & polls', avgWatch: '—',
    newVsReturning: { new: 54, returning: 46 }, device: { mobile: 82, desktop: 18 },
    language: { arabic: 58, english: 42 },
    hashtags: ['#EPChamber', '#BreakingEP', '#InvestEP', '#Vision2030', '#Trade'],
    activeHours: activeHours([62, 80, 48, 36, 44, 30, 14]),
    formats: [{ format: 'Threads', value: 42 }, { format: 'Images', value: 28 }, { format: 'Polls', value: 18 }, { format: 'Links', value: 12 }],
    insight: 'X skews male and professional, most active early morning — real-time economic updates and polls outperform here.',
  },
  instagram: {
    accent: platformChartColor('instagram'), reach: '498K', growth: '+4.1%',
    gender: gender(47), age: AGE([20, 42, 24, 10, 4]), cities: CITIES, sentiment: sentiment(78),
    bestTime: 'Daily, 8–10 PM', topFormat: 'Reels', avgWatch: '0:18',
    newVsReturning: { new: 66, returning: 34 }, device: { mobile: 96, desktop: 4 },
    language: { arabic: 67, english: 33 },
    hashtags: ['#EPChamber', '#Dammam', '#SMEStories', '#WomenInBusiness', '#Reels'],
    activeHours: activeHours([10, 22, 40, 38, 70, 96, 52]),
    formats: [{ format: 'Reels', value: 54 }, { format: 'Carousel', value: 26 }, { format: 'Stories', value: 14 }, { format: 'Posts', value: 6 }],
    insight: 'Instagram has the youngest, most balanced audience — Reels and member-story carousels convert best at night.',
  },
  linkedin: {
    accent: platformChartColor('linkedin'), reach: '311K', growth: '+3.0%',
    gender: gender(61), age: AGE([8, 40, 33, 14, 5]), cities: CITIES, sentiment: sentiment(81),
    bestTime: 'Sun & Mon, 9–11 AM', topFormat: 'Documents & articles', avgWatch: '0:33',
    newVsReturning: { new: 49, returning: 51 }, device: { mobile: 71, desktop: 29 },
    language: { arabic: 41, english: 59 },
    hashtags: ['#EPChamber', '#Investment', '#Leadership', '#Vision2030', '#B2B'],
    activeHours: activeHours([40, 86, 64, 50, 38, 22, 8]),
    formats: [{ format: 'Documents', value: 38 }, { format: 'Articles', value: 30 }, { format: 'Images', value: 20 }, { format: 'Video', value: 12 }],
    insight: 'LinkedIn is the most senior, highest-sentiment audience and the only one with more returning than new visitors — ideal for investor-grade content.',
  },
  facebook: {
    accent: platformChartColor('facebook'), reach: '540K', growth: '-0.8%',
    gender: gender(55), age: AGE([10, 30, 32, 18, 10]), cities: CITIES, sentiment: sentiment(66),
    bestTime: 'Daily, 6–8 PM', topFormat: 'Video & events', avgWatch: '0:24',
    newVsReturning: { new: 58, returning: 42 }, device: { mobile: 84, desktop: 16 },
    language: { arabic: 72, english: 28 },
    hashtags: ['#EPChamber', '#Events', '#Community', '#EasternProvince'],
    activeHours: activeHours([16, 28, 44, 48, 76, 70, 30]),
    formats: [{ format: 'Video', value: 40 }, { format: 'Photos', value: 30 }, { format: 'Events', value: 20 }, { format: 'Links', value: 10 }],
    insight: 'Facebook reach dipped this month and skews older — prioritise event listings and native video to recover momentum.',
  },
  snapchat: {
    accent: platformChartColor('snapchat'), reach: '240K', growth: '+5.0%',
    gender: gender(44), age: AGE([34, 40, 18, 6, 2]), cities: CITIES, sentiment: sentiment(74),
    bestTime: 'Daily, 3–6 PM', topFormat: 'Stories & Spotlight', avgWatch: '0:09',
    newVsReturning: { new: 72, returning: 28 }, device: { mobile: 99, desktop: 1 },
    language: { arabic: 81, english: 19 },
    hashtags: ['#EPChamber', '#BTS', '#YouthEP', '#Snap'],
    activeHours: activeHours([14, 24, 56, 72, 64, 48, 26]),
    formats: [{ format: 'Stories', value: 58 }, { format: 'Spotlight', value: 30 }, { format: 'Ads', value: 12 }],
    insight: 'Snapchat reaches the youngest, most Arabic-first audience — behind-the-scenes Stories in the afternoon win.',
  },
  tiktok: {
    accent: platformChartColor('tiktok'), reach: '421K', growth: '+9.2%',
    gender: gender(49), age: AGE([30, 42, 18, 7, 3]), cities: CITIES, sentiment: sentiment(71),
    bestTime: 'Tue & Thu, 7–9 PM', topFormat: 'Short video', avgWatch: '0:14',
    newVsReturning: { new: 74, returning: 26 }, device: { mobile: 98, desktop: 2 },
    language: { arabic: 69, english: 31 },
    hashtags: ['#EPChamber', '#SMEtok', '#Vision2030', '#FYP', '#Dammam'],
    activeHours: activeHours([12, 20, 38, 42, 66, 94, 58]),
    formats: [{ format: 'Videos', value: 78 }, { format: 'Lives', value: 14 }, { format: 'Ads', value: 8 }],
    insight: 'TikTok is the fastest-growing channel (+9.2%) with the youngest audience — founder mini-series at night drive the highest reach.',
  },
};

export const audienceFor = (platform: TPlatformId | 'all'): IAudienceView => VIEWS[platform];

// Re-export for the platform accent (used by the screen for colour-coding).
export { getPlatform };
