import { Router } from 'express';
import { getRun, updateRun, scheduleCheck } from '../db';
import { fetchAndStoreAnalytics } from '../services/insights';

const router = Router();

router.post('/runs/:id/post', (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const { ig_post_id, li_post_id, x_post_id } = req.body;
  const postedAt = new Date().toISOString();

  updateRun(id, {
    ig_post_id: ig_post_id || null,
    li_post_id: li_post_id || null,
    x_post_id: x_post_id || null,
    status: 'posted',
    posted_at: postedAt,
  });

  // Schedule analytics checks at +24h, +48h, +7d
  const posted = new Date(postedAt);
  const h24 = new Date(posted.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const h48 = new Date(posted.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const d7 = new Date(posted.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  scheduleCheck(id, h24, '24h');
  scheduleCheck(id, h48, '48h');
  scheduleCheck(id, d7, '7d');

  res.json(getRun(id));
});

router.post('/runs/:id/fetch-analytics', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  try {
    const result = await fetchAndStoreAnalytics(id, false);
    res.json(result);
  } catch (err: any) {
    console.error('Analytics fetch error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
  }
});

export default router;
