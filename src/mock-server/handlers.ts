import { http, HttpResponse } from 'msw';
import { POSTS, getPostAnalytics } from './posts';
import { ACCOUNTS } from './accounts';
import { KPIS, FOLLOWERS_BY_PLATFORM, TREND } from './kpis';
import { REPORTS } from './reports';
import { CONVERSATIONS, TEAM, SAVED_REPLIES } from './inbox';
import { INTERESTS, SENTIMENT_THEMES } from './audience';
import { HEATMAP, SUGGESTED_SLOTS, BEST_TIME_RECS } from './besttime';
import { AI_SUGGESTIONS } from './ai';

// REST mock API for the demo, served by MSW under VITE_API_BASE (/api).
// Enabled only in mock mode (VITE_ENABLE_MSW=true). The UI currently reads the
// same data in-memory; these endpoints make the mock layer real for any API wiring.
const BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || '/api';
const url = (p: string) => `${BASE}${p}`;

export const handlers = [
  http.get(url('/posts'), () => HttpResponse.json(POSTS)),
  http.get(url('/posts/:id'), ({ params }) => {
    const post = POSTS.find((p) => p.id === params.id);
    if (!post) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ post, analytics: getPostAnalytics(post) });
  }),
  http.get(url('/accounts'), () => HttpResponse.json(ACCOUNTS)),
  http.get(url('/kpis'), () => HttpResponse.json({ kpis: KPIS, followersByPlatform: FOLLOWERS_BY_PLATFORM, trend: TREND })),
  http.get(url('/reports'), () => HttpResponse.json(REPORTS)),
  http.get(url('/inbox'), () => HttpResponse.json({ conversations: CONVERSATIONS, team: TEAM, savedReplies: SAVED_REPLIES })),
  http.get(url('/audience'), () => HttpResponse.json({ interests: INTERESTS, sentiment: SENTIMENT_THEMES })),
  http.get(url('/besttime'), () => HttpResponse.json({ heatmap: HEATMAP, slots: SUGGESTED_SLOTS, recommendations: BEST_TIME_RECS })),
  http.get(url('/ai/suggestions'), () => HttpResponse.json(AI_SUGGESTIONS)),
  http.get(url('/health'), () => HttpResponse.json({ ok: true, service: 'epcc-mock-server' })),
];
