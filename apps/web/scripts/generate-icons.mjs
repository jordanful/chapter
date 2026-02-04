#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateIcons() {
  try {
    const sharp = (await import('sharp')).default;
    const svgPath = join(publicDir, 'favicon.svg');
    const svgBuffer = readFileSync(svgPath);

    const sizes = [
      { name: 'icon-192.png', size: 192 },
      { name: 'icon-512.png', size: 512 },
      { name: 'apple-touch-icon.png', size: 180 },
    ];

    for (const { name, size } of sizes) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(join(publicDir, name));
      console.log(`Generated ${name}`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('sharp is not installed. Run: pnpm add -D sharp');
      process.exit(1);
    }
    throw error;
  }
}

generateIcons();
