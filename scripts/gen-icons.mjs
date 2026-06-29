// Generates toolbar icons for the extension from Logo2.png.
// The source has a large black margin around a circular coin, which makes the
// Chrome toolbar icon look tiny. We trim the black border so the coin fills the
// frame, mask it into a clean circle (transparent corners), then emit each size.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, 'Logo2.png');
const OUT_DIR = resolve(root, 'public');
mkdirSync(OUT_DIR, { recursive: true });

const SIZES = { 16: 'icon-16.png', 32: 'icon-32.png', 48: 'icon-48.png', 128: 'icon-128.png' };

// Scan raw RGB to find the bounding box of the (non-dark) coin.
async function detectBBox() {
  const { data, info } = await sharp(SRC)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // The circular coin is bordered by a bright GOLD rim (high red & green, low
  // blue). Stars are white (high blue) and the interior is green, so a gold
  // colour test isolates the rim — and thus the coin's circular bounds.
  const isGold = (r, g, b) => r > 170 && g > 120 && b < 130 && r - b > 70;
  const colCount = new Array(width).fill(0);
  const rowCount = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isGold(data[i], data[i + 1], data[i + 2])) {
        colCount[x]++;
        rowCount[y]++;
      }
    }
  }
  // Require a small run per row/column to ignore stray gold specks.
  const MIN = 4;
  const firstAbove = (arr) => arr.findIndex(v => v >= MIN);
  const lastAbove = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] >= MIN) return i; return -1; };
  const top = firstAbove(rowCount);
  const bottom = lastAbove(rowCount);
  // The coin is circular and horizontally centred in the source. The vertical
  // rim extent is the most reliable diameter (horizontal glints widen the cols),
  // so build a centred square from it.
  const diameter = bottom - top + 1;
  const cx = Math.round(width / 2);
  const cy = Math.round((top + bottom) / 2);
  const half = Math.round(diameter / 2);
  const left = Math.max(0, cx - half);
  const topSq = Math.max(0, cy - half);
  const side = Math.min(diameter, width - left, height - topSq);
  return { left, top: topSq, width: side, height: side };
}

async function run() {
  // 1. Detect & crop tightly to the coin so it fills the frame.
  const bbox = await detectBBox();
  console.log('coin bbox:', bbox);
  const trimmed = await sharp(SRC).extract(bbox).png().toBuffer();

  // 2. Fit (no distortion) into a square transparent canvas.
  const BASE = 512;
  const square = await sharp(trimmed)
    .resize(BASE, BASE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 3. Circular mask -> transparent corners.
  const mask = Buffer.from(
    `<svg width="${BASE}" height="${BASE}"><circle cx="${BASE / 2}" cy="${BASE / 2}" r="${BASE / 2}" fill="#fff"/></svg>`
  );
  const masked = await sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 4. Emit each target size.
  for (const [size, name] of Object.entries(SIZES)) {
    await sharp(masked)
      .resize(Number(size), Number(size), { fit: 'cover' })
      .png()
      .toFile(resolve(OUT_DIR, name));
    console.log(`wrote public/${name}`);
  }

  // Keep a 128px "Logo.png" for any code still referencing it.
  await sharp(masked).resize(128, 128).png().toFile(resolve(OUT_DIR, 'Logo.png'));
  console.log('wrote public/Logo.png');
}

run().catch(err => { console.error(err); process.exit(1); });
