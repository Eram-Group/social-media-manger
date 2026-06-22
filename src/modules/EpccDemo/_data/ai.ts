// Canned AI assistant output for the demo (environment analysis + idea suggestions).
export const AI_ENVIRONMENT_SUMMARY =
  'This month the Chamber’s audience responded most strongly to SME success stories ' +
  'and Vision 2030 economic updates. Short-form video on TikTok and Instagram drove ' +
  '38% more engagement than static posts. Sentiment is positive (72%), with the only ' +
  'recurring concern being response time to member enquiries — worth addressing publicly.';

export interface IAiSuggestion {
  id: string;
  title: string;
  detail: string;
  platforms: string;
  bestTime: string;
}

export const AI_SUGGESTIONS: IAiSuggestion[] = [
  {
    id: 'a1',
    title: 'SME founder mini-series (3 reels)',
    detail:
      'Spotlight three member companies in 30-second vertical videos. Builds on the best-performing format this month.',
    platforms: 'TikTok, Instagram, Snapchat',
    bestTime: 'Tue & Thu, 7–9 PM',
  },
  {
    id: 'a2',
    title: 'Vision 2030 economic brief carousel',
    detail:
      'A 5-slide LinkedIn + X carousel translating the latest non-oil growth figures into member-relevant insights.',
    platforms: 'LinkedIn, X',
    bestTime: 'Sun, 10 AM',
  },
  {
    id: 'a3',
    title: '“Ask the Chamber” live Q&A',
    detail:
      'Address the member response-time concern head-on with a scheduled live session and a recap post.',
    platforms: 'Instagram, Facebook',
    bestTime: 'Wed, 1 PM',
  },
  {
    id: 'a4',
    title: 'Logistics & Trade summit countdown',
    detail:
      'A 4-day countdown teaser campaign with speaker highlights to drive event registrations.',
    platforms: 'X, LinkedIn, Facebook',
    bestTime: 'Daily, 8:30 AM',
  },
  {
    id: 'a5',
    title: 'Women-in-business networking recap',
    detail:
      'User-generated content reel from the last session — strong fit for the 25–34 audience segment.',
    platforms: 'Instagram, TikTok',
    bestTime: 'Mon, 6 PM',
  },
];
