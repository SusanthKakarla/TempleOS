#!/usr/bin/env node
/**
 * Removes the flat white background from the approved source logo, producing
 * the transparent master that scripts/generate-brand-assets.mjs reads from.
 *
 * Thresholds below were measured directly against the actual source file
 * (not guessed): background pixels sit at min-channel 253-255 (a few levels
 * of paper-grain noise baked into the artwork), while genuine edge
 * anti-aliasing at shape boundaries dips through roughly 200-252 over 1-2px.
 * A naive "close to white" cutoff around 248 catches that background grain as
 * if it were meaningful edge detail, producing visible speckle once
 * composited on a dark surface — hence the tighter 220-253 band here.
 *
 * Usage: node scripts/remove-logo-background.mjs <source.png> <output.png>
 */
import sharp from "sharp";

const [, , sourcePath, outputPath] = process.argv;
if (!sourcePath || !outputPath) {
  console.error("Usage: node scripts/remove-logo-background.mjs <source.png> <output.png>");
  process.exit(1);
}

const WHITE_FLOOR = 220;
const WHITE_CEIL = 253;

const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

for (let i = 0; i < width * height; i++) {
  const idx = i * channels;
  const minC = Math.min(data[idx], data[idx + 1], data[idx + 2]);
  if (minC >= WHITE_CEIL) {
    data[idx + 3] = 0;
  } else if (minC >= WHITE_FLOOR) {
    const t = (WHITE_CEIL - minC) / (WHITE_CEIL - WHITE_FLOOR);
    data[idx + 3] = Math.round(255 * t);
  }
}

await sharp(data, { raw: { width, height, channels } }).png({ compressionLevel: 9 }).toFile(outputPath);
console.log(`Wrote ${outputPath} (${width}x${height})`);
