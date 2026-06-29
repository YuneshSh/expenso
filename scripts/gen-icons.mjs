// Generates Chrome extension toolbar icons from Logo3.png.
//
// Logo3 has a transparent background, so we detect the coin via its alpha
// channel, crop away the padding, then place the coin at ~114px centred inside a
// 128x128 canvas (small transparent margin) so it reads large in the toolbar.
// Smaller sizes are downscaled from that 128px master.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, 'Logo3.png');
const OUT_DIR = resolve(root, 'public', 'icons');
mkdirSync(OUT_DIR, { recursive: true });

const CANVAS = 128;     // master canvas size
const COIN = 114;       // coin diameter inside the master canvas (~7px margin)
const SIZES = [16, 32, 48, 128];

// Bounding box of all sufficiently-opaque pixels.
async function detectAlphaBBox() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const ALPHA = 16;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + (channels - 1)];
      if (a > ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function run() {
  const bbox = await detectAlphaBBox();
  console.log('coin bbox:', bbox);

  // Crop tightly to the coin, scale to COIN px (no distortion), centre on a
  // transparent CANVAS, preserving transparency.
  const margin = Math.round((CANVAS - COIN) / 2);
  const master = await sharp(SRC)
    .extract(bbox)
    .resize(COIN, COIN, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: margin, bottom: CANVAS - COIN - margin,
      left: margin, right: CANVAS - COIN - margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  for (const size of SIZES) {
    await sharp(master)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(resolve(OUT_DIR, `icon${size}.png`));
    console.log(`wrote public/icons/icon${size}.png`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
