#!/usr/bin/env node
/**
 * Extracts the 17 individual temple-artwork tiles from the two source
 * collages into assets/themes/source/*.png (lossless, full crop resolution),
 * then produces the optimized WebP + blur-placeholder library consumed by
 * the Theme Engine (lib/themes/registry.ts).
 *
 * Tile coordinates below were measured once via scripts/detect-collage-grid.mjs
 * (gutter/lightness detection, not eyeballed) against the two collages
 * provided for the EL10 "Premium Visual Theme System" background library.
 * Re-run detect-collage-grid.mjs and update these coordinates if the source
 * collages are ever regenerated at different tile positions.
 *
 * Usage: node scripts/extract-theme-artwork.mjs <collage-irregular-5.png> <collage-grid-12.png>
 */
import sharp from "sharp";
import fs from "fs";

const [, , collageIrregularPath, collageGridPath] = process.argv;
if (!collageIrregularPath || !collageGridPath) {
  console.error(
    "Usage: node scripts/extract-theme-artwork.mjs <collage-irregular-5-tile.png> <collage-uniform-12-tile.png>",
  );
  process.exit(1);
}

const SOURCE_DIR = "assets/themes/source";
const BACKGROUNDS_DIR = "assets/themes/backgrounds";
fs.mkdirSync(SOURCE_DIR, { recursive: true });
fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });

// Irregular 5-tile mosaic: 1 tall hero (col 1) + 2 stacked (col 2, row A) + 2 side-by-side (row B).
const irregularTiles = [
  { name: "golden-sunrise-hero", left: 12, top: 12, width: 876, height: 650 },
  { name: "cream-bells-temple", left: 901, top: 12, width: 622, height: 345 },
  { name: "olive-dusk-temple", left: 901, top: 370, width: 622, height: 292 },
  { name: "navy-night-temple", left: 12, top: 675, width: 876, height: 336 },
  { name: "rust-orange-temple", left: 901, top: 675, width: 622, height: 336 },
];

// Uniform 4-row x 3-col grid.
const gridRows = [
  { top: 7, height: 276 },
  { top: 292, height: 230 },
  { top: 532, height: 226 },
  { top: 767, height: 249 },
];
const gridCols = [
  { left: 7, width: 499 },
  { left: 515, width: 505 },
  { left: 1029, width: 499 },
];
const gridNames = [
  ["forest-mandala-temple", "golden-riverside-temple", "maroon-lamp-temple"],
  ["cream-leaves-temple", "navy-stars-temple", "golden-bell-pillar-temple"],
  ["teal-lotus-temple", "orange-silk-temple", "blue-mountain-birds-temple"],
  ["dark-pillars-lamps-temple", "misty-mountain-landscape-temple", "deep-blue-gold-temple"],
];

async function extractAndOptimize(name, sourcePath, region) {
  const pngPath = `${SOURCE_DIR}/${name}.png`;
  const webpPath = `${BACKGROUNDS_DIR}/${name}.webp`;

  await sharp(sourcePath).extract(region).png({ compressionLevel: 9 }).toFile(pngPath);
  await sharp(pngPath).webp({ quality: 82 }).toFile(webpPath);

  const meta = await sharp(pngPath).metadata();
  const blurBuffer = await sharp(pngPath).resize(24).blur(2).webp({ quality: 40 }).toBuffer();

  return {
    name,
    width: meta.width,
    height: meta.height,
    blurDataURL: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
  };
}

async function run() {
  const blurMap = {};

  for (const tile of irregularTiles) {
    const result = await extractAndOptimize(tile.name, collageIrregularPath, {
      left: tile.left,
      top: tile.top,
      width: tile.width,
      height: tile.height,
    });
    blurMap[tile.name] = result;
    console.log(`${tile.name}: ${result.width}x${result.height}`);
  }

  for (let r = 0; r < gridRows.length; r++) {
    for (let c = 0; c < gridCols.length; c++) {
      const name = gridNames[r][c];
      const result = await extractAndOptimize(name, collageGridPath, {
        left: gridCols[c].left,
        top: gridRows[r].top,
        width: gridCols[c].width,
        height: gridRows[r].height,
      });
      blurMap[name] = result;
      console.log(`${name}: ${result.width}x${result.height}`);
    }
  }

  fs.writeFileSync(`${SOURCE_DIR}/../blur-placeholders.json`, JSON.stringify(blurMap, null, 2));
  console.log(`\nExtracted and optimized ${Object.keys(blurMap).length} tiles.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
