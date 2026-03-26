import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { getRun, updateRun } from '../db';
import { getFigmaFileUrl, listTextNodes, exportFramesAsPng } from '../services/figma';

const router = Router();

const EXPORTS_DIR = path.join(process.cwd(), 'exports');

/**
 * POST /runs/:id/create
 * Moves the run to 'creating' status.
 * The creation step is manual — user copies content into Figma.
 */
router.post('/runs/:id/create', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  updateRun(id, { status: 'creating' });
  res.json({ status: 'creating' });
});

/**
 * POST /runs/:id/mark-ready
 * User clicks this after they've finished editing in Figma.
 * Optionally exports preview thumbnails.
 */
router.post('/runs/:id/mark-ready', async (req, res) => {
  const id = Number(req.params.id);
  const run = getRun(id);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  // Try to export preview thumbnails from Figma (non-blocking)
  const frameIds = process.env.FIGMA_FRAME_NODE_IDS?.split(',').map(s => s.trim()).filter(Boolean) || [];
  let previewPath = '';

  if (frameIds.length > 0) {
    try {
      const urls = await exportFramesAsPng(frameIds);
      if (urls.length > 0) {
        const runDir = path.join(EXPORTS_DIR, String(id));
        fs.mkdirSync(runDir, { recursive: true });

        for (let i = 0; i < urls.length; i++) {
          const dest = path.join(runDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
          await downloadFile(urls[i], dest);
        }
        previewPath = `/exports/${id}`;
      }
    } catch (err: any) {
      console.warn('Preview export failed (non-blocking):', err.message);
    }
  }

  updateRun(id, {
    status: 'ready',
    drive_folder_url: previewPath || null,
  });

  res.json({ status: 'ready', previewPath });
});

/**
 * GET /runs/:id/slides
 * Serve exported slide previews (if any).
 */
router.get('/runs/:id/slides', (req, res) => {
  const id = req.params.id;
  const runDir = path.join(EXPORTS_DIR, id);
  if (!fs.existsSync(runDir)) return res.json([]);

  const files = fs.readdirSync(runDir)
    .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
    .sort()
    .map(f => `/exports/${id}/${f}`);
  res.json(files);
});

/**
 * GET /figma/url
 * Returns the Figma file URL to open the carousel template.
 */
router.get('/figma/url', (_req, res) => {
  try {
    const url = getFigmaFileUrl();
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /figma/text-nodes/:nodeId
 * List all text nodes under a parent node — helps with Settings mapping.
 */
router.get('/figma/text-nodes/:nodeId', async (req, res) => {
  try {
    const nodes = await listTextNodes(req.params.nodeId);
    res.json(nodes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirect = response.headers.location;
        if (redirect) return downloadFile(redirect, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

export default router;
