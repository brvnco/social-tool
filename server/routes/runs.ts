import { Router } from 'express';
import { createRun, getAllRuns, getRun, updateRun, getAllSettings, setSetting, getSetting } from '../db';
import { AVAILABLE_MODELS } from '../services/claude';

const router = Router();

router.post('/runs', (_req, res) => {
  const id = createRun();
  res.json({ id, status: 'researching' });
});

router.get('/runs', (_req, res) => {
  const runs = getAllRuns();
  res.json(runs);
});

router.get('/runs/:id', (req, res) => {
  const run = getRun(Number(req.params.id));
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

router.patch('/runs/:id', (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  updateRun(id, req.body);
  res.json(getRun(id));
});

// Settings endpoints
router.get('/settings', (_req, res) => {
  const settings = getAllSettings();
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json(obj);
});

router.put('/settings/:key', (req, res) => {
  setSetting(req.params.key, req.body.value);
  res.json({ key: req.params.key, value: req.body.value });
});

router.get('/settings/:key', (req, res) => {
  const value = getSetting(req.params.key);
  res.json({ key: req.params.key, value: value || null });
});

// Models endpoint
router.get('/models', (_req, res) => {
  // Check which providers have API keys configured
  const availableProviders: string[] = [];
  if (process.env.ANTHROPIC_API_KEY) availableProviders.push('anthropic');
  if (process.env.OPENAI_API_KEY) availableProviders.push('openai');
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) availableProviders.push('google');

  const models = AVAILABLE_MODELS.map(m => ({
    ...m,
    available: availableProviders.includes(m.provider),
  }));

  // Get current selections
  const selections = {
    discover: getSetting('model_discover') || 'claude-haiku-4-5-20251001',
    research: getSetting('model_research') || 'claude-haiku-4-5-20251001',
    rewrite: getSetting('model_rewrite') || 'claude-haiku-4-5-20251001',
  };

  res.json({ models, selections });
});

// Update model selection
router.put('/models/:phase', (req, res) => {
  const phase = req.params.phase;
  if (!['discover', 'research', 'rewrite'].includes(phase)) {
    return res.status(400).json({ error: 'Phase must be discover, research, or rewrite' });
  }
  const { modelId } = req.body;
  if (!modelId || !AVAILABLE_MODELS.find(m => m.id === modelId)) {
    return res.status(400).json({ error: 'Invalid model ID' });
  }
  setSetting(`model_${phase}`, modelId);
  res.json({ phase, modelId });
});

export default router;
