/**
 * Convert the herzies favicon SVG to a 22x22 tray icon PNG.
 * Uses black pixels with alpha — macOS template images auto-adapt to dark/light mode.
 * Also generates @2x (44x44) for retina.
 *
 * Run: node scripts/generate-tray-icon.js
 */

import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));

function createPNG(width, height, pixels) {
  // Filter each row (filter type 0 = None)
  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * rowLen + 1 + x * 4;
      raw[di] = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
      raw[di + 3] = pixels[si + 3];
    }
  }

  const deflated = deflateSync(raw);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflated),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Parse the SVG and rasterize black-filled rects onto a pixel buffer.
 * The SVG is 44x44 — we render at that size for @2x, and halve for @1x.
 */
function rasterizeSVG(svgPath, size) {
  const svg = readFileSync(svgPath, "utf-8");
  const pixels = new Uint8Array(size * size * 4); // RGBA, all transparent

  // Parse rect elements
  const rectRegex = /<rect([^/>]*)\/?>/g;
  let match;
  const scale = size / 44; // SVG viewBox is 44x44

  while ((match = rectRegex.exec(svg)) !== null) {
    const attrs = match[1];
    const w = Number(attrs.match(/width="([^"]+)"/)?.[1] ?? 0);
    const h = Number(attrs.match(/height="([^"]+)"/)?.[1] ?? 0);
    const fill = attrs.match(/fill="([^"]+)"/)?.[1] ?? "";

    // Only render black fills (for template image)
    if (fill !== "black") continue;

    // Parse transform for position
    let tx = 0, ty = 0;
    const translateMatch = attrs.match(/translate\(([^)]+)\)/);
    if (translateMatch) {
      const parts = translateMatch[1].split(/[\s,]+/).map(Number);
      tx = parts[0] ?? 0;
      ty = parts[1] ?? 0;
    }

    // Check for matrix transform (flipped rects)
    const matrixMatch = attrs.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const parts = matrixMatch[1].split(/[\s,]+/).map(Number);
      // matrix(a,b,c,d,e,f) — we only care about translation (e,f)
      // For matrix(-1,0,0,1,tx,ty) the rect is flipped horizontally
      tx = parts[4] ?? 0;
      ty = parts[5] ?? 0;
      if (parts[0] === -1) tx -= w; // flip: adjust x
      if (parts[3] === -1) ty -= h; // flip: adjust y
    }

    // Scale and draw
    const sx = Math.round(tx * scale);
    const sy = Math.round(ty * scale);
    const sw = Math.max(1, Math.round(w * scale));
    const sh = Math.max(1, Math.round(h * scale));

    for (let y = sy; y < sy + sh && y < size; y++) {
      for (let x = sx; x < sx + sw && x < size; x++) {
        if (x < 0 || y < 0) continue;
        const i = (y * size + x) * 4;
        pixels[i] = 0;       // R
        pixels[i + 1] = 0;   // G
        pixels[i + 2] = 0;   // B
        pixels[i + 3] = 255; // A
      }
    }
  }

  return pixels;
}

const svgPath = join(__dirname, "../../web/src/app/icon.svg");

// @1x (22x22)
const pixels1x = rasterizeSVG(svgPath, 22);
const png1x = createPNG(22, 22, pixels1x);
writeFileSync(join(__dirname, "../resources/iconTemplate.png"), png1x);
console.log(`Wrote iconTemplate.png (${png1x.length} bytes)`);

// @2x (44x44)
const pixels2x = rasterizeSVG(svgPath, 44);
const png2x = createPNG(44, 44, pixels2x);
writeFileSync(join(__dirname, "../resources/iconTemplate@2x.png"), png2x);
console.log(`Wrote iconTemplate@2x.png (${png2x.length} bytes)`);
