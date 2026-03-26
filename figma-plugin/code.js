// Delta Carousel Populator — Figma Plugin
// Receives slide data from the UI and updates text nodes by name or ID.
"use strict";

figma.showUI(__html__, { width: 420, height: 520 });

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

async function populateSlides(slides, nodeMap) {
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideNum = i + 1;

    for (const [field, text] of Object.entries(slide)) {
      if (!text || typeof text !== 'string') continue;

      const mapKey = `slide${String(slideNum).padStart(2, '0')}_${field}`;
      const altKey = `slide${slideNum}_${field}`;

      // Strategy 1: Find by node ID from the mapping
      const nodeId = nodeMap[mapKey] || nodeMap[altKey];
      let targetNode = null;

      if (nodeId) {
        const figmaId = nodeId.includes(':') ? nodeId : nodeId.replace('-', ':');
        const found = figma.getNodeById(figmaId);
        if (found && found.type === 'TEXT') {
          targetNode = found;
        }
      }

      // Strategy 2: Find by layer name
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
          const fontName = targetNode.fontName;
          if (fontName !== figma.mixed) {
            await figma.loadFontAsync(fontName);
          } else {
            const fonts = targetNode.getRangeAllFontNames(0, targetNode.characters.length);
            for (const font of fonts) {
              await figma.loadFontAsync(font);
            }
          }
          targetNode.characters = text;
          updated++;
        } catch (innerErr) {
          failed++;
          errors.push(`${mapKey}: ${innerErr.message || 'font load failed'}`);
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

async function scanTextNodes() {
  const page = figma.currentPage;
  const textNodes = [];

  function walk(node) {
    if (node.type === 'TEXT') {
      textNodes.push({
        id: node.id.replace(':', '-'),
        name: node.name,
        text: (node.characters || '').substring(0, 80),
        parent: node.parent ? node.parent.name : '',
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

function findTextNodeByName(name) {
  const page = figma.currentPage;

  function walk(node) {
    if (node.type === 'TEXT' && node.name.toLowerCase() === name.toLowerCase()) {
      return node;
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
