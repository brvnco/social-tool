// Delta Carousel Populator — Figma Plugin
// Receives slide data from the UI and updates text nodes by name or ID.

figma.showUI(__html__, { width: 420, height: 520 });

// ── Message handler ──

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'populate') {
    await populateSlides(msg.slides, msg.nodeMap);
  }

  if (msg.type === 'scan-nodes') {
    await scanTextNodes();
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// ── Populate text nodes with slide content ──

async function populateSlides(
  slides: Array<Record<string, string>>,
  nodeMap: Record<string, string>
) {
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideNum = i + 1;

    for (const [field, text] of Object.entries(slide)) {
      if (!text || typeof text !== 'string') continue;

      // Build possible keys for this field
      const mapKey = `slide${String(slideNum).padStart(2, '0')}_${field}`;
      const altKey = `slide${slideNum}_${field}`;

      // Strategy 1: Find by node ID from the mapping
      const nodeId = nodeMap[mapKey] || nodeMap[altKey];
      let targetNode: TextNode | null = null;

      if (nodeId) {
        // Node IDs from the web tool use dash format (6-1095), Figma uses colon (6:1095)
        const figmaId = nodeId.replace('-', ':');
        const found = figma.getNodeById(figmaId);
        if (found && found.type === 'TEXT') {
          targetNode = found as TextNode;
        }
      }

      // Strategy 2: Find by layer name convention
      if (!targetNode) {
        const namesToTry = [mapKey, altKey, `s${slideNum}_${field}`];
        for (const name of namesToTry) {
          const found = findTextNodeByName(name);
          if (found) {
            targetNode = found;
            break;
          }
        }
      }

      if (targetNode) {
        try {
          // Load the font used by this node
          const fontName = targetNode.fontName as FontName;
          await figma.loadFontAsync(fontName);
          targetNode.characters = text;
          updated++;
        } catch (err: any) {
          // If mixed fonts, try loading all fonts on the node
          try {
            const fonts = targetNode.getRangeAllFontNames(0, targetNode.characters.length);
            for (const font of fonts) {
              await figma.loadFontAsync(font);
            }
            targetNode.characters = text;
            updated++;
          } catch (innerErr: any) {
            failed++;
            errors.push(`${mapKey}: ${innerErr.message || 'font load failed'}`);
          }
        }
      } else {
        failed++;
        errors.push(`${mapKey}: node not found`);
      }
    }
  }

  figma.ui.postMessage({
    type: 'populate-result',
    updated,
    failed,
    errors,
  });

  if (updated > 0) {
    figma.notify(`Updated ${updated} text field${updated !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`);
  }
}

// ── Scan current page for text nodes (helps with mapping) ──

async function scanTextNodes() {
  const page = figma.currentPage;
  const textNodes: Array<{ id: string; name: string; text: string; parent: string }> = [];

  function walk(node: SceneNode) {
    if (node.type === 'TEXT') {
      textNodes.push({
        id: node.id.replace(':', '-'),
        name: node.name,
        text: (node.characters || '').substring(0, 80),
        parent: node.parent?.name || '',
      });
    }
    if ('children' in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  for (const child of page.children) {
    walk(child);
  }

  figma.ui.postMessage({
    type: 'scan-result',
    nodes: textNodes,
  });
}

// ── Helpers ──

function findTextNodeByName(name: string): TextNode | null {
  const page = figma.currentPage;

  function walk(node: SceneNode): TextNode | null {
    if (node.type === 'TEXT' && node.name.toLowerCase() === name.toLowerCase()) {
      return node as TextNode;
    }
    if ('children' in node) {
      for (const child of node.children) {
        const found = walk(child);
        if (found) return found;
      }
    }
    return null;
  }

  for (const child of page.children) {
    const found = walk(child);
    if (found) return found;
  }
  return null;
}
