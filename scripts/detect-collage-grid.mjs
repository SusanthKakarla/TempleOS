#!/usr/bin/env node
/**
 * Diagnostic tool for splitting a new theme-artwork collage into individual
 * tiles. Collages are laid out as separate rounded cards over a near-white
 * background — this scans row/column average lightness to find the gutter
 * bands between cards, so tile boundaries can be measured without eyeballing
 * pixel coordinates. Used once per new collage to derive the tile
 * coordinates that then get hardcoded into extract-theme-artwork.mjs.
 *
 * Usage: node scripts/detect-collage-grid.mjs <path-to-collage.png> [xStart xEnd]
 *   xStart/xEnd optionally restrict the scan to one column's x-range, needed
 *   for collages with irregular (non-uniform-grid) tile layouts where a
 *   global full-width scan won't see gutters local to one column.
 */
import sharp from "sharp";

const [, , filePath, xStartArg, xEndArg] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/detect-collage-grid.mjs <collage.png> [xStart xEnd]");
  process.exit(1);
}

function findBands(lightness, len, threshold) {
  const bands = [];
  let start = null;
  for (let i = 0; i < len; i++) {
    if (lightness[i] > threshold) {
      if (start === null) start = i;
    } else if (start !== null) {
      bands.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null) bands.push([start, len - 1]);
  return bands;
}

const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const xStart = xStartArg ? Number(xStartArg) : 0;
const xEnd = xEndArg ? Number(xEndArg) : width;

console.log(`Image: ${width}x${height}, scanning x:[${xStart},${xEnd}]`);

const rowLight = new Float64Array(height);
for (let y = 0; y < height; y++) {
  let sum = 0;
  for (let x = xStart; x < xEnd; x++) {
    const idx = (y * width + x) * channels;
    sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }
  rowLight[y] = sum / (xEnd - xStart);
}
const colLight = new Float64Array(width);
for (let x = 0; x < width; x++) {
  let sum = 0;
  for (let y = 0; y < height; y++) {
    const idx = (y * width + x) * channels;
    sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }
  colLight[x] = sum / height;
}

for (const t of [230, 200, 150]) {
  console.log(`Row gutter bands >${t}:`, findBands(rowLight, height, t).filter(([a, b]) => b - a >= 2).map(([a, b]) => `${a}-${b}`).join(", "));
}
for (const t of [230, 200, 150]) {
  console.log(`Col gutter bands >${t}:`, findBands(colLight, width, t).filter(([a, b]) => b - a >= 2).map(([a, b]) => `${a}-${b}`).join(", "));
}
