import { Router } from 'express';
import { createRun, getAllRuns, getRun, updateRun, getAllSettings, setSetting, getSetting } from '../db';

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

export default router;
