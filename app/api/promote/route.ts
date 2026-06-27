import { NextRequest, NextResponse } from 'next/server';
import { listAccounts } from '@/server/store';
import { graphPost } from '@/server/connectors/meta';

// POST /api/promote — boost an existing post via the Meta Marketing API.
//
// REALITY: boosting/ads require a Meta AD ACCOUNT + the `ads_management` permission
// (App Review) + Business Verification + a payment method. There is no public API
// that boosts a post without these. When they're not configured we return the exact
// setup steps instead of pretending. When they ARE configured we create the campaign
// + ad set + ad as PAUSED (status=PAUSED) so NOTHING is charged until a human reviews
// and activates it in Ads Manager — safe by default.
//
// Env needed: META_AD_ACCOUNT_ID = act_XXXXXXXX (the ad account to bill).
// Token: a connected Facebook Page token that also holds ads_management.

const REQUIREMENTS = [
  'Create a Meta Ad Account (business.facebook.com → Ads Manager) and add a payment method.',
  'Complete Business Verification for the app/business.',
  'Submit App Review for the "ads_management" permission (and "ads_read").',
  'Set META_AD_ACCOUNT_ID=act_XXXXXXXX in the app environment.',
  'Reconnect the Facebook Page so its token includes ads_management.',
];

// Objective → Outcome (ODAX) objective + optimization goal.
function mapObjective(objective: string): { objective: string; optimization_goal: string } {
  switch (objective) {
    case 'awareness': return { objective: 'OUTCOME_AWARENESS', optimization_goal: 'REACH' };
    case 'traffic':
    case 'registrations': return { objective: 'OUTCOME_TRAFFIC', optimization_goal: 'LINK_CLICKS' };
    default: return { objective: 'OUTCOME_ENGAGEMENT', optimization_goal: 'POST_ENGAGEMENT' };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { objective = 'awareness', budgetSar = 0, days = 7, platforms = ['facebook', 'instagram'], objectStoryId, postContent, targeting = {}, startDate } = body;

  const adAccount = process.env.META_AD_ACCOUNT_ID; // act_XXXX
  const fb = (await listAccounts()).find((a) => a.platform === 'facebook' && a.accessToken);

  if (!adAccount || !fb) {
    return NextResponse.json({
      ok: false,
      needsSetup: true,
      message: !adAccount
        ? 'No Meta Ad Account is connected yet, so this builds a plan but can’t spend real money.'
        : 'Connect a Facebook Page (Accounts) whose token has ads_management.',
      requirements: REQUIREMENTS,
    });
  }
  // Boosting an existing post needs its FB post id as the creative (object_story_id,
  // e.g. "{pageId}_{postId}"). Targeting can still include Instagram via the ad set.
  if (!objectStoryId) {
    return NextResponse.json({
      ok: false,
      needsSetup: false,
      message: 'This post has no Facebook post reference to use as the ad creative. Boost a post that was published to Facebook.',
    });
  }

  const token = fb.accessToken;
  const map = mapObjective(objective);
  const dailyMinor = Math.max(100, Math.round((Number(budgetSar) / Number(days)) * 100)); // SAR → halalas
  const soon = Math.floor(Date.now() / 1000) + 600; // earliest start: 10 min from now
  const scheduled = startDate ? Math.floor(new Date(`${startDate}T08:00:00`).getTime() / 1000) : 0;
  const start = scheduled > soon ? scheduled : soon;
  const end = start + Number(days) * 86400;
  const name = `Boost · ${String(postContent ?? '').slice(0, 30)} · ${new Date().toISOString().slice(0, 10)}`;

  try {
    // 1) Campaign (PAUSED — never auto-spends)
    const campaign = await graphPost<{ id: string }>(`${adAccount}/campaigns`, {
      access_token: token, name, objective: map.objective,
      special_ad_categories: JSON.stringify([]), status: 'PAUSED',
    });

    // 2) Ad set — budget, schedule, geo (SA) + publisher platforms
    const targetingSpec: Record<string, unknown> = {
      geo_locations: { countries: ['SA'] }, // city-level needs Meta's geo-search lookup
      publisher_platforms: platforms.includes('instagram') && platforms.includes('facebook') ? ['facebook', 'instagram']
        : platforms.includes('instagram') ? ['instagram'] : ['facebook'],
    };
    // Real Meta fields: age + gender map cleanly from the detailed targeting UI.
    if (targeting.ageMin) targetingSpec.age_min = Number(targeting.ageMin);
    if (targeting.ageMax) targetingSpec.age_max = Number(targeting.ageMax);
    if (targeting.gender === 'female') targetingSpec.genders = [2];
    else if (targeting.gender === 'male') targetingSpec.genders = [1];

    const adset = await graphPost<{ id: string }>(`${adAccount}/adsets`, {
      access_token: token, name, campaign_id: campaign.id,
      daily_budget: String(dailyMinor), billing_event: 'IMPRESSIONS',
      optimization_goal: map.optimization_goal, bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      start_time: String(start), end_time: String(end),
      targeting: JSON.stringify(targetingSpec), status: 'PAUSED',
    });

    // 3) Ad creative from the existing post + 4) the ad (PAUSED)
    const creative = await graphPost<{ id: string }>(`${adAccount}/adcreatives`, {
      access_token: token, name, object_story_id: String(objectStoryId),
    });
    const ad = await graphPost<{ id: string }>(`${adAccount}/ads`, {
      access_token: token, name, adset_id: adset.id,
      creative: JSON.stringify({ creative_id: creative.id }), status: 'PAUSED',
    });

    return NextResponse.json({
      ok: true,
      paused: true,
      message: 'Boost created as PAUSED in your Ad Account — review and activate it in Ads Manager to start spending.',
      ids: { campaignId: campaign.id, adSetId: adset.id, creativeId: creative.id, adId: ad.id },
      adsManagerUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${adAccount.replace('act_', '')}`,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, needsSetup: false, message: `Meta rejected the boost: ${(e as Error).message}` }, { status: 200 });
  }
}
