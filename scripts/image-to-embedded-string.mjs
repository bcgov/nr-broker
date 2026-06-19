#!/usr/bin/env node

// This script converts an image file to a base64-encoded data URI string that can be embedded directly in HTML or CSS.
// It supports common image formats like SVG, PNG, JPEG, GIF, and WebP.
// For SVG files, it also performs compression by removing unnecessary whitespace and metadata to optimize the output size.
// Use https://jakearchibald.github.io/svgomg/ to further optimize SVGs before running this script if needed.

import fs from 'node:fs';
import path from 'node:path';

function printUsageAndExit() {
  console.error('Usage: node scripts/image-to-embedded-string.mjs <image-path>');
  process.exit(1);
}

function mimeTypeForExtension(ext) {
  const normalized = ext.toLowerCase();

  if (normalized === '.svg') {
    return 'image/svg+xml';
  }
  if (normalized === '.png') {
    return 'image/png';
  }
  if (normalized === '.jpg' || normalized === '.jpeg') {
    return 'image/jpeg';
  }
  if (normalized === '.gif') {
    return 'image/gif';
  }
  if (normalized === '.webp') {
    return 'image/webp';
  }

  return 'application/octet-stream';
}

function compressSvg(svgText) {
  // Remove metadata and editor-specific blocks first.
  let compressed = svgText
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '')
    .replace(/<sodipodi:namedview[\s\S]*?\/>/gi, '');

  // Collapse whitespace while preserving SVG semantics.
  compressed = compressed
    .replace(/\r?\n/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return compressed;
}

function main() {
  const imagePathArg = process.argv[2];
  if (!imagePathArg) {
    printUsageAndExit();
  }

  const imagePath = path.resolve(process.cwd(), imagePathArg);
  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    process.exit(1);
  }

  const extension = path.extname(imagePath);
  const mimeType = mimeTypeForExtension(extension);

  let payloadBuffer;
  if (extension.toLowerCase() === '.svg') {
    const svgText = fs.readFileSync(imagePath, 'utf8');
    const compressedSvg = compressSvg(svgText);
    payloadBuffer = Buffer.from(compressedSvg, 'utf8');
  } else {
    payloadBuffer = fs.readFileSync(imagePath);
  }

  const base64Payload = payloadBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Payload}`;

  // Print only the data URI so output can be piped directly into scripts.
  process.stdout.write(`${dataUri}\n`);
}

main();
