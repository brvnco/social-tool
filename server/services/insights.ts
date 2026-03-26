import { getRun, updateRun, getRecentRuns, setSetting } from '../db';

interface AnalyticsResult {
  reach: number;
  saves: number;
  clicks: number;
  score: number;
  low_saves: boolean;
  low_reach: boolean;
}

export async function fetchAndStoreAnalytics(
  runId: number,
  isFinalCheck: boolean
): Promise<AnalyticsResult> {
  const run = getRun(runId);
  if (!run) throw new Error('Run not found');

  let totalReach = 0;
  let totalSaves = 0;
  let totalClicks = 0;

  // Fetch Instagram insights
  if (run.ig_post_id) {
    try {
      const igMetrics = await fetchInstagramInsights(run.ig_post_id);
      totalReach += igMetrics.reach;
      totalSaves += igMetrics.saved;
      totalClicks += igMetrics.clicks;
    } catch (err) {
      console.error('IG insights error:', err);
    }
  }

  // Fetch LinkedIn stats
  if (run.li_post_id) {
    try {
      const liMetrics = await fetchLinkedInStats(run.li_post_id);
      totalReach += liMetrics.impressions;
      totalClicks += liMetrics.clicks;
    } catch (err) {
      console.error('LinkedIn stats error:', err);
    }
  }

  // Fetch X metrics
  if (run.x_post_id) {
    try {
      const xMetrics = await fetchXMetrics(run.x_post_id);
      totalReach += xMetrics.impressions;
      totalClicks += xMetrics.url_link_clicks;
    } catch (err) {
      console.error('X metrics error:', err);
    }
  }

  // Calculate score (average of normalized metrics)
  const recentRuns = getRecentRuns(4);
  const avgReach = recentRuns.reduce((s, r) => s + (r.reach || 0), 0) / Math.max(recentRuns.length, 1);
  const avgSaves = recentRuns.reduce((s, r) => s + (r.saves || 0), 0) / Math.max(recentRuns.length, 1);

  const reachScore = avgReach > 0 ? totalReach / avgReach : 1;
  const savesScore = avgSaves > 0 ? totalSaves / avgSaves : 1;
  const score = Math.round(((reachScore + savesScore) / 2) * 100) / 100;

  const lowSaves = totalSaves < avgSaves * 0.8;
  const lowReach = totalReach < avgReach * 0.8;

  const result: AnalyticsResult = {
    reach: totalReach,
    saves: totalSaves,
    clicks: totalClicks,
    score,
    low_saves: lowSaves,
    low_reach: lowReach,
  };

  // Update the run
  const updateFields: any = {
    reach: totalReach,
    saves: totalSaves,
    clicks: totalClicks,
    score,
    low_saves: lowSaves ? 1 : 0,
    low_reach: lowReach ? 1 : 0,
  };

  if (isFinalCheck) {
    updateFields.status = 'complete';

    // Update rolling averages
    const allCompleted = getRecentRuns(8).filter(r => r.status === 'complete');
    if (allCompleted.length > 0) {
      const newAvgReach = Math.round(allCompleted.reduce((s, r) => s + (r.reach || 0), 0) / allCompleted.length);
      const newAvgSaves = Math.round(allCompleted.reduce((s, r) => s + (r.saves || 0), 0) / allCompleted.length);
      const newAvgClicks = Math.round(allCompleted.reduce((s, r) => s + (r.clicks || 0), 0) / allCompleted.length);
      const newAvgScore = Math.round((allCompleted.reduce((s, r) => s + (r.score || 0), 0) / allCompleted.length) * 100) / 100;

      setSetting('avg_reach', String(newAvgReach));
      setSetting('avg_saves', String(newAvgSaves));
      setSetting('avg_clicks', String(newAvgClicks));
      setSetting('avg_score', String(newAvgScore));
    }
  }

  updateRun(runId, updateFields);
  return result;
}

async function fetchInstagramInsights(postId: string) {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error('IG_ACCESS_TOKEN not set');

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${postId}/insights?metric=reach,saved,clicks&access_token=${token}`
  );

  if (!response.ok) throw new Error(`IG API error: ${response.statusText}`);
  const data = await response.json();

  const metrics: Record<string, number> = { reach: 0, saved: 0, clicks: 0 };
  for (const item of data.data || []) {
    if (item.name === 'reach') metrics.reach = item.values?.[0]?.value || 0;
    if (item.name === 'saved') metrics.saved = item.values?.[0]?.value || 0;
    if (item.name === 'clicks') metrics.clicks = item.values?.[0]?.value || 0;
  }
  return metrics;
}

async function fetchLinkedInStats(postId: string) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN not set');

  const response = await fetch(
    `https://api.linkedin.com/v2/socialActions/${postId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error(`LinkedIn API error: ${response.statusText}`);
  const data = await response.json();

  return {
    impressions: data.totalShareStatistics?.impressionCount || 0,
    clicks: data.totalShareStatistics?.clickCount || 0,
  };
}

async function fetchXMetrics(postId: string) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error('X_BEARER_TOKEN not set');

  const response = await fetch(
    `https://api.x.com/2/tweets/${postId}?tweet.fields=public_metrics`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) throw new Error(`X API error: ${response.statusText}`);
  const data = await response.json();

  return {
    impressions: data.data?.public_metrics?.impression_count || 0,
    url_link_clicks: data.data?.public_metrics?.url_link_clicks || 0,
  };
}
