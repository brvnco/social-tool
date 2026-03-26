/**
 * Figma service — read-only helpers.
 *
 * The Figma REST API cannot write text content to nodes.
 * Text population is done manually by the user in the Figma editor.
 * This service provides:
 *   1. A direct link to the Figma file/frame
 *   2. Node inspection (to help map IDs in settings)
 *   3. Optional PNG export for preview thumbnails
 */

const FIGMA_API = 'https://api.figma.com/v1';

function getToken(): string {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN not set');
  return token;
}

function getFileId(): string {
  return process.env.FIGMA_FILE_ID || 'RiCMWapLKbsuNXcKKqRo27';
}

/**
 * Build a URL that opens the Figma file at the carousel template frame.
 */
export function getFigmaFileUrl(): string {
  const fileId = getFileId();
  const startNode = process.env.FIGMA_START_NODE_ID || '1-19';
  // Figma URLs use node-id query param with dash format
  return `https://www.figma.com/design/${fileId}?node-id=${startNode}`;
}

/**
 * Fetch the children of a node — useful for discovering text node IDs.
 */
export async function getNodeChildren(nodeId: string): Promise<any> {
  const token = getToken();
  const fileId = getFileId();
  const apiNodeId = nodeId.replace('-', ':');

  const res = await fetch(
    `${FIGMA_API}/files/${fileId}/nodes?ids=${encodeURIComponent(apiNodeId)}&depth=5`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.nodes?.[apiNodeId]?.document || null;
}

/**
 * List all text nodes under a given parent node.
 * Returns flat array of { id, name, characters } for mapping in Settings.
 */
export async function listTextNodes(parentNodeId: string): Promise<Array<{ id: string; name: string; characters: string }>> {
  const doc = await getNodeChildren(parentNodeId);
  if (!doc) return [];

  const results: Array<{ id: string; name: string; characters: string }> = [];

  function walk(node: any) {
    if (node.type === 'TEXT') {
      results.push({
        id: node.id.replace(':', '-'),  // normalize to dash format
        name: node.name,
        characters: node.characters || '',
      });
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  walk(doc);
  return results;
}

/**
 * Get the width of a frame node to calculate export scale.
 */
async function getFrameWidth(frameId: string): Promise<number> {
  const token = getToken();
  const fileId = getFileId();
  const apiId = frameId.replace('-', ':');

  const res = await fetch(
    `${FIGMA_API}/files/${fileId}/nodes?ids=${encodeURIComponent(apiId)}&depth=0`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!res.ok) return 0;
  const data = await res.json();
  const node = data.nodes?.[apiId]?.document;
  return node?.absoluteBoundingBox?.width || node?.size?.x || 0;
}

/**
 * Export specific frame node IDs as PNG at 1080px width.
 * Returns array of temporary Figma CDN URLs (valid ~30 min).
 */
export async function exportFramesAsPng(frameIds: string[], targetWidth = 1080): Promise<string[]> {
  if (frameIds.length === 0) throw new Error('No frame IDs provided');

  const token = getToken();
  const fileId = getFileId();
  const apiIds = frameIds.map(id => id.replace('-', ':')).join(',');

  // Determine scale factor: fetch the width of the first frame
  let scale = 2; // default fallback
  try {
    const frameWidth = await getFrameWidth(frameIds[0]);
    if (frameWidth > 0) {
      scale = Math.min(4, Math.max(0.01, targetWidth / frameWidth));
      // Round to 2 decimal places
      scale = Math.round(scale * 100) / 100;
      console.log(`Figma export: frame width=${frameWidth}, target=${targetWidth}, scale=${scale}`);
    }
  } catch (err) {
    console.warn('Could not determine frame width, using scale=2');
  }

  const res = await fetch(
    `${FIGMA_API}/images/${fileId}?ids=${encodeURIComponent(apiIds)}&scale=${scale}&format=png`,
    { headers: { 'X-Figma-Token': token } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma export failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  const urls: string[] = [];

  if (data.images) {
    for (const fid of frameIds) {
      const apiId = fid.replace('-', ':');
      if (data.images[apiId]) {
        urls.push(data.images[apiId]);
      }
    }
  }

  return urls;
}
