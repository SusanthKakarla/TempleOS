#!/usr/bin/env node
/**
 * Generates the full TempleOS brand asset library from the one approved
 * source logo (assets/brand/source/templeos-logo-transparent.png — already
 * background-removed once via a one-off script; that transparent master is
 * the single source of truth this reads from).
 *
 * Produces:
 *  - Full logo (emblem + wordmark) as PNG/WebP, tightly cropped
 *  - Icon/mark (emblem only, square) as PNG/WebP, tightly cropped
 *  - Monochrome black/white icon variants
 *  - SVG wrappers (raster-embedded — see docs/BRAND-GUIDELINES.md for why this
 *    isn't a true vector trace)
 *  - The full favicon/PWA/Apple/Android/maskable icon set into public/
 *  - A hand-built favicon.ico (sharp can't emit .ico; modern ICO readers
 *    accept embedded PNG frames directly, so this needs no extra dependency)
 *
 * Re-run with `node scripts/generate-brand-assets.mjs` any time the source
 * logo changes — every output is deterministically derived, nothing here is
 * hand-tuned per file.
 */
import sharp from "sharp";
import fs from "fs";

const SOURCE = "assets/brand/source/templeos-logo-transparent.png";
const LOGO_DIR = "assets/brand/logo";
const ICON_DIR = "assets/brand/icon";
const PUBLIC_DIR = "public";

fs.mkdirSync(LOGO_DIR, { recursive: true });
fs.mkdirSync(ICON_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Measured once from the source (see the extraction commit for the sampling
// script) — the emblem (tree/temple/people mark) sits above the wordmark
// with a clear transparent gap between them.
const FULL_BBOX = { left: 223, top: 120, width: 1029 - 223, height: 1145 - 120 };
const EMBLEM_BBOX = { left: 223, top: 120, width: 1029 - 223, height: 966 - 120 };
const PADDING_RATIO = 0.06; // 6% breathing room on every side, not a hard crop to the pixel edge

function padded(bbox, canvasIsSquare) {
  const padX = Math.round(bbox.width * PADDING_RATIO);
  const padY = Math.round(bbox.height * PADDING_RATIO);
  let left = Math.max(0, bbox.left - padX);
  let top = Math.max(0, bbox.top - padY);
  let width = bbox.width + padX * 2;
  let height = bbox.height + padY * 2;
  if (canvasIsSquare) {
    const size = Math.max(width, height);
    left -= Math.round((size - width) / 2);
    top -= Math.round((size - height) / 2);
    width = size;
    height = size;
  }
  return { left, top, width, height };
}

async function extractOnto(sourcePath, region, canvasSize) {
  // Extend (not just extract) so a square canvas around a non-square bbox
  // gets real transparent padding instead of a distorted crop.
  const img = sharp(sourcePath);
  const meta = await img.metadata();
  const left = Math.max(0, -region.left);
  const top = Math.max(0, -region.top);
  const cropLeft = Math.max(0, region.left);
  const cropTop = Math.max(0, region.top);
  const cropWidth = Math.min(meta.width - cropLeft, region.width - left);
  const cropHeight = Math.min(meta.height - cropTop, region.height - top);

  let pipeline = sharp(sourcePath).extract({
    left: cropLeft,
    top: cropTop,
    width: cropWidth,
    height: cropHeight,
  });

  const needsExtend = left > 0 || top > 0 || cropWidth < region.width - left || cropHeight < region.height - top;
  if (needsExtend) {
    pipeline = pipeline.extend({
      top,
      left,
      bottom: region.height - cropHeight - top,
      right: region.width - cropWidth - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  if (canvasSize) {
    pipeline = pipeline.resize(canvasSize, canvasSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  return pipeline.png();
}

async function toMono(buffer, hex) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    // alpha (data[idx+3]) untouched — preserves the shape exactly
  }
  return sharp(data, { raw: { width, height, channels } }).png();
}

function svgWrapper(pngBase64, width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" href="data:image/png;base64,${pngBase64}"/>
</svg>
`;
}

/** Minimal valid ICO container embedding PNG frames directly (supported by every browser/OS since Vista) — avoids pulling in an extra dependency just for one file. */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  pngBuffers.forEach(({ size, buffer }, i) => {
    const entryOffset = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset); // width (0 = 256)
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1); // height
    header.writeUInt8(0, entryOffset + 2); // color count
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // color planes
    header.writeUInt16LE(32, entryOffset + 6); // bits per pixel
    header.writeUInt32LE(buffer.length, entryOffset + 8); // data size
    header.writeUInt32LE(offset, entryOffset + 12); // data offset
    offset += buffer.length;
    entries.push(buffer);
  });

  return Buffer.concat([header, ...entries]);
}

async function run() {
  // --- Full logo (emblem + wordmark) ---
  const fullRegion = padded(FULL_BBOX, false);
  const fullPng = await (await extractOnto(SOURCE, fullRegion)).toBuffer();
  fs.writeFileSync(`${LOGO_DIR}/templeos-logo-full.png`, fullPng);
  await sharp(fullPng).webp({ quality: 90 }).toFile(`${LOGO_DIR}/templeos-logo-full.webp`);
  const fullMeta = await sharp(fullPng).metadata();
  fs.writeFileSync(`${LOGO_DIR}/templeos-logo-full.svg`, svgWrapper(fullPng.toString("base64"), fullMeta.width, fullMeta.height));
  console.log(`templeos-logo-full: ${fullMeta.width}x${fullMeta.height}`);

  // --- Icon/mark (emblem only, square) ---
  const iconRegion = padded(EMBLEM_BBOX, true);
  // The transparent gap between emblem and wordmark starts at y=968 (measured)
  // — clamp so square-canvas padding never pulls in a sliver of the wordmark.
  const GAP_START = 968;
  if (iconRegion.top + iconRegion.height > GAP_START) {
    iconRegion.height = GAP_START - iconRegion.top;
  }
  const iconPng1024 = await (await extractOnto(SOURCE, iconRegion, 1024)).toBuffer();
  fs.writeFileSync(`${ICON_DIR}/templeos-icon.png`, iconPng1024);
  await sharp(iconPng1024).webp({ quality: 90 }).toFile(`${ICON_DIR}/templeos-icon.webp`);
  fs.writeFileSync(`${ICON_DIR}/templeos-icon.svg`, svgWrapper(iconPng1024.toString("base64"), 1024, 1024));
  console.log("templeos-icon: 1024x1024");

  // --- Monochrome variants (icon shape, solid color) ---
  const monoBlack = await (await toMono(iconPng1024, "#111111")).toBuffer();
  fs.writeFileSync(`${ICON_DIR}/templeos-icon-mono-black.png`, monoBlack);
  const monoWhite = await (await toMono(iconPng1024, "#ffffff")).toBuffer();
  fs.writeFileSync(`${ICON_DIR}/templeos-icon-mono-white.png`, monoWhite);
  console.log("mono black/white icons written");

  // --- Favicon PNG set ---
  const faviconSizes = [16, 32, 48];
  const faviconBuffers = [];
  for (const size of faviconSizes) {
    const buf = await sharp(iconPng1024).resize(size, size).png().toBuffer();
    fs.writeFileSync(`${PUBLIC_DIR}/favicon-${size}x${size}.png`, buf);
    faviconBuffers.push({ size, buffer: buf });
    console.log(`favicon-${size}x${size}.png`);
  }
  fs.writeFileSync(`${PUBLIC_DIR}/favicon.ico`, buildIco(faviconBuffers));
  console.log("favicon.ico (16/32/48 embedded PNG frames)");
  fs.writeFileSync(`${PUBLIC_DIR}/favicon.svg`, svgWrapper(iconPng1024.toString("base64"), 1024, 1024));

  // --- Apple touch icon (solid background — iOS renders transparency as black) ---
  const appleBg = { r: 250, g: 249, b: 247, alpha: 1 }; // --background token, light mode
  await sharp(iconPng1024)
    .resize(180, 180)
    .flatten({ background: appleBg })
    .png()
    .toFile(`${PUBLIC_DIR}/apple-touch-icon.png`);
  console.log("apple-touch-icon.png (180x180, flattened onto brand background)");

  // --- Android / PWA icons ---
  for (const size of [192, 512]) {
    await sharp(iconPng1024).resize(size, size).png().toFile(`${PUBLIC_DIR}/android-chrome-${size}x${size}.png`);
    console.log(`android-chrome-${size}x${size}.png`);
  }

  // --- Maskable icons (safe zone: content within the inner ~80%, per the
  // maskable-icon spec, so an OS mask cropping to a circle/squircle never
  // clips the tree/temple silhouette) ---
  for (const size of [192, 512]) {
    const innerSize = Math.round(size * 0.7);
    const pad = Math.round((size - innerSize) / 2);
    const inner = await sharp(iconPng1024).resize(innerSize, innerSize).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 250, g: 249, b: 247, alpha: 1 } } })
      .composite([{ input: inner, left: pad, top: pad }])
      .png()
      .toFile(`${PUBLIC_DIR}/maskable-icon-${size}x${size}.png`);
    console.log(`maskable-icon-${size}x${size}.png`);
  }

  // --- Windows tile ---
  await sharp(iconPng1024)
    .resize(150, 150)
    .flatten({ background: appleBg })
    .png()
    .toFile(`${PUBLIC_DIR}/mstile-150x150.png`);
  console.log("mstile-150x150.png");

  // --- Open Graph / Twitter card image (1200x630, logo centered on the brand background) ---
  const ogWidth = 1200;
  const ogHeight = 630;
  const ogLogoHeight = 460;
  const ogLogo = await sharp(fullPng).resize({ height: ogLogoHeight }).toBuffer();
  const ogLogoMeta = await sharp(ogLogo).metadata();
  await sharp({ create: { width: ogWidth, height: ogHeight, channels: 4, background: { r: 250, g: 249, b: 247, alpha: 1 } } })
    .composite([{ input: ogLogo, left: Math.round((ogWidth - ogLogoMeta.width) / 2), top: Math.round((ogHeight - ogLogoHeight) / 2) }])
    .png()
    .toFile(`${PUBLIC_DIR}/og-image.png`);
  console.log(`og-image.png (${ogWidth}x${ogHeight})`);

  console.log("\nBrand asset generation complete.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
