import { Router } from 'express';
import { getRun, updateRun, getRecentRuns, getSetting } from '../db';
import { proposeDirections, buildBrief, rewriteBrief, ResearchContext } from '../services/claude';

const router = Router();

function buildContext(): ResearchContext {
  const recentRuns = getRecentRuns(4);
  return {
    last_topic: recentRuns[0]?.topic || null,
    recent_topics: recentRuns.map((r: any) => r.topic).filter(Boolean),
    low_saves: recentRuns[0]?.low_saves === 1,
    low_reach: recentRuns[0]?.low_reach === 1,
    avg_saves: Number(getSetting('avg_saves')) || 0,
    avg_reach: Number(getSetting('avg_reach')) || 0,
  };
}

// Phase 1: Propose 3 topic directions (fast, no web search)
router.post('/runs/:id/propose', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  try {
    updateRun(id, { status: 'researching' });
    const context = buildContext();
    const directions = await proposeDirections(context);

    // Store directions in visual_direction_json temporarily
    updateRun(id, {
      status: 'picking',
      visual_direction_json: JSON.stringify({ directions }),
    });

    res.json({ directions });
  } catch (err: any) {
    console.error('Propose error:', err);
    updateRun(id, { status: 'error' });
    res.status(500).json({ error: err.message || 'Failed to propose directions' });
  }
});

// Phase 2: Build full brief for chosen direction (uses web search)
router.get('/research/:id/stream', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (run.status !== 'briefing') return res.status(400).json({ error: 'Run is not in briefing state' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const visualData = JSON.parse(run.visual_direction_json || '{}');
    const chosenDirection = visualData.chosen_direction;

    if (!chosenDirection) {
      throw new Error('No direction chosen. Pick a direction first.');
    }

    const context = buildContext();
    const brief = await buildBrief(chosenDirection, context, sendEvent);

    updateRun(id, {
      topic: brief.topic,
      angle: brief.angle,
      delta_feature: brief.delta_feature_primary || brief.delta_feature || chosenDirection.delta_feature,
      validation_score: brief.validation_score || chosenDirection.score,
      cta: brief.cta,
      instagram_caption: brief.instagram_caption,
      linkedin_caption: brief.linkedin_caption,
      x_caption: brief.x_caption,
      slides_json: JSON.stringify(brief.slides),
      visual_direction_json: JSON.stringify({
        directions: visualData.directions,
        chosen_direction: chosenDirection,
        imagery: brief.imagery,
        backup: brief.backup,
        why_now: brief.why_now || chosenDirection.why_now,
        delta_feature_secondary: brief.delta_feature_secondary,
        pro_angle: brief.pro_angle,
        flagged: brief.flagged,
        flagged_reason: brief.flagged_reason,
      }),
      status: 'pending_approval',
    });

    sendEvent({ type: 'complete' });
  } catch (err: any) {
    console.error('Research stream error:', err);
    sendEvent({ type: 'error', message: err.message || 'Research failed' });
    updateRun(id, { status: 'error' });
  }

  res.end();
});

// Pick a direction — sets the chosen direction and advances to briefing
router.post('/runs/:id/pick', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const { direction } = req.body;
  if (!direction) return res.status(400).json({ error: 'Direction is required' });

  const visualData = JSON.parse(run.visual_direction_json || '{}');
  visualData.chosen_direction = direction;

  updateRun(id, {
    topic: direction.topic,
    angle: direction.angle,
    visual_direction_json: JSON.stringify(visualData),
    status: 'briefing',
  });

  res.json(getRun(id));
});

// Rewrite an existing brief with feedback (non-streaming fallback)
router.post('/runs/:id/rewrite', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const { feedback } = req.body;
  if (!feedback) return res.status(400).json({ error: 'Feedback is required' });

  try {
    const currentBrief = buildCurrentBrief(run);
    const brief = await rewriteBrief(currentBrief, feedback);
    saveBriefToRun(id, brief, run);
    res.json(getRun(id));
  } catch (err: any) {
    console.error('Rewrite error:', err);
    res.status(500).json({ error: err.message || 'Rewrite failed' });
  }
});

// Rewrite with SSE streaming
router.get('/rewrite/:id/stream', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  const feedback = req.query.feedback as string;
  if (!feedback) return res.status(400).json({ error: 'Feedback query param is required' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const currentBrief = buildCurrentBrief(run);
    const brief = await rewriteBrief(currentBrief, feedback, sendEvent);
    saveBriefToRun(id, brief, run);
    sendEvent({ type: 'complete' });
  } catch (err: any) {
    console.error('Rewrite stream error:', err);
    sendEvent({ type: 'error', message: err.message || 'Rewrite failed' });
  }

  res.end();
});

function buildCurrentBrief(run: any) {
  return {
    topic: run.topic,
    angle: run.angle,
    delta_feature_primary: run.delta_feature,
    cta: run.cta,
    validation_score: run.validation_score,
    slides: JSON.parse(run.slides_json || '[]'),
    visual_direction: JSON.parse(run.visual_direction_json || '{}'),
    instagram_caption: run.instagram_caption,
    linkedin_caption: run.linkedin_caption,
    x_caption: run.x_caption,
  };
}

function saveBriefToRun(id: number, brief: any, run: any) {
  const visualData = JSON.parse(run.visual_direction_json || '{}');
  updateRun(id, {
    topic: brief.topic,
    angle: brief.angle,
    delta_feature: brief.delta_feature_primary || brief.delta_feature,
    validation_score: brief.validation_score,
    cta: brief.cta,
    instagram_caption: brief.instagram_caption,
    linkedin_caption: brief.linkedin_caption,
    x_caption: brief.x_caption,
    slides_json: JSON.stringify(brief.slides),
    visual_direction_json: JSON.stringify({
      ...visualData,
      ...(brief.visual_direction || {}),
      imagery: brief.imagery,
      backup: brief.backup,
      why_now: brief.why_now,
      delta_feature_secondary: brief.delta_feature_secondary,
      pro_angle: brief.pro_angle,
      flagged: brief.flagged,
      flagged_reason: brief.flagged_reason,
    }),
    status: 'pending_approval',
  });
}

export default router;
