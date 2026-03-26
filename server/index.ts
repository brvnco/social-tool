import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

import runsRouter from './routes/runs';
import researchRouter from './routes/research';
import creationRouter from './routes/creation';
import analyticsRouter from './routes/analytics';
import { getPendingChecks, markCheckComplete, getRun, getSetting, setSetting } from './db';
import { fetchAndStoreAnalytics } from './services/insights';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', runsRouter);
app.use('/api', researchRouter);
app.use('/api', creationRouter);
app.use('/api', analyticsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  const required = [
    'ANTHROPIC_API_KEY', 'FIGMA_ACCESS_TOKEN', 'FIGMA_FILE_ID',
    'FIGMA_FRAME_NODE_IDS',
  ];
  const optional = [
    'IG_ACCESS_TOKEN', 'IG_USER_ID',
    'LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN', 'X_BEARER_TOKEN',
  ];
  const status: Record<string, { present: boolean; required: boolean }> = {};
  for (const v of required) {
    status[v] = { present: !!process.env[v], required: true };
  }
  for (const v of optional) {
    status[v] = { present: !!process.env[v], required: false };
  }
  const ok = required.every(v => !!process.env[v]);
  res.json({ status, ok });
});

// Serve uploaded screens and exported slides
app.use('/tmp/screens', express.static(path.join(process.cwd(), 'tmp', 'screens')));
app.use('/exports', express.static(path.join(process.cwd(), 'exports')));

// Serve static client in production
app.use(express.static(path.join(__dirname, '../client')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Monitor loop for scheduled analytics checks
function startMonitorLoop() {
  setInterval(async () => {
    try {
      const pending = getPendingChecks();
      for (const check of pending) {
        const run = getRun(check.run_id);
        if (run) {
          await fetchAndStoreAnalytics(check.run_id, check.check_type === '7d');
          markCheckComplete(check.id);
        }
      }
    } catch (err) {
      console.error('Monitor loop error:', err);
    }
  }, 60000); // Check every minute
}

// Seed Figma node map from env if not already in DB
function seedFigmaNodeMap() {
  const existing = getSetting('figma_node_map');
  if (existing && existing !== '{}') return;

  const envMap = process.env.FIGMA_TEXT_NODE_MAP;
  if (!envMap || envMap === '{}') return;

  try {
    // Env format: {"slide01_title":"6-1095", ...} — field name → node ID (dash format)
    const raw = JSON.parse(envMap);
    setSetting('figma_node_map', JSON.stringify(raw));
    console.log('Seeded Figma node map from env:', Object.keys(raw).length, 'entries');
  } catch (err) {
    console.error('Failed to parse FIGMA_TEXT_NODE_MAP:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Delta Social Tool running on port ${PORT}`);
  seedFigmaNodeMap();
  startMonitorLoop();
});
