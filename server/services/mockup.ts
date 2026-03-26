import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const MOCKUPS_DIR = path.join(process.cwd(), 'server', 'assets', 'mockups');

/**
 * Mockup config: defines where the screen region sits inside each mockup PNG.
 * Add an entry here for each mockup file in server/assets/mockups/.
 * x, y = top-left of screen area; width, height = screen area dimensions;
 * borderRadius = corner radius for the screen mask.
 *
 * If no config exists for a mockup, it defaults to a centered region
 * with a 10% margin on each side.
 */
const MOCKUP_CONFIGS: Record<string, { x: number; y: number; width: number; height: number; borderRadius: number }> = {
  // Example: 'iphone-15-pro': { x: 58, y: 120, width: 340, height: 738, borderRadius: 30 },
};

export async function compositeScreenInMockup(
  screenPath: string,
  mockupName: string
): Promise<{ localPath: string }> {
  const mockupFile = findMockupFile(mockupName);
  if (!mockupFile) {
    throw new Error(`Mockup file not found for: "${mockupName}". Place mockup PNGs in server/assets/mockups/`);
  }

  // Get mockup dimensions
  const mockupMeta = await sharp(mockupFile).metadata();
  const mw = mockupMeta.width!;
  const mh = mockupMeta.height!;

  // Get screen region config, or default to centered with 10% margin
  const baseName = path.basename(mockupFile, path.extname(mockupFile));
  const config = MOCKUP_CONFIGS[baseName] || {
    x: Math.round(mw * 0.1),
    y: Math.round(mh * 0.1),
    width: Math.round(mw * 0.8),
    height: Math.round(mh * 0.8),
    borderRadius: 20,
  };

  // Resize the screen image to fit the screen region
  const screenResized = await sharp(screenPath)
    .resize(config.width, config.height, { fit: 'cover' })
    .png()
    .toBuffer();

  // Create a rounded-corner mask if needed
  let screenLayer = screenResized;
  if (config.borderRadius > 0) {
    const mask = Buffer.from(
      `<svg width="${config.width}" height="${config.height}">
        <rect x="0" y="0" width="${config.width}" height="${config.height}" rx="${config.borderRadius}" ry="${config.borderRadius}" fill="white"/>
      </svg>`
    );
    screenLayer = await sharp(screenResized)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  // Composite: screen underneath the mockup frame
  const outputDir = path.join(process.cwd(), 'tmp', 'composited');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `mockup-${Date.now()}.png`);

  await sharp(mockupFile)
    .composite([
      {
        input: screenLayer,
        left: config.x,
        top: config.y,
        // Place screen behind the mockup frame
      },
    ])
    .png()
    .toFile(outputPath);

  return { localPath: outputPath };
}

function findMockupFile(name: string): string | null {
  if (!fs.existsSync(MOCKUPS_DIR)) {
    fs.mkdirSync(MOCKUPS_DIR, { recursive: true });
    return null;
  }

  const files = fs.readdirSync(MOCKUPS_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  if (files.length === 0) return null;

  // Try exact match
  const exactMatch = files.find(f => f.replace(/\.[^.]+$/, '') === name);
  if (exactMatch) return path.join(MOCKUPS_DIR, exactMatch);

  // Try case-insensitive partial match
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const partialMatch = files.find(f => {
    const normalized = f.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.includes(normalizedName);
  });
  if (partialMatch) return path.join(MOCKUPS_DIR, partialMatch);

  // Default to first image
  return path.join(MOCKUPS_DIR, files[0]);
}
