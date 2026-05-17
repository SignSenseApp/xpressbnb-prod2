import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const src = path.join(publicDir, 'main-xpx-logo.png');

if (!fs.existsSync(src)) {
  console.error('Missing', src, '— add the XpressBnB logo PNG to public/ first.');
  process.exit(1);
}

const icoSizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  icoSizes.map((s) =>
    sharp(src)
      .resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  )
);

fs.writeFileSync(path.join(publicDir, 'favicon.ico'), await pngToIco(pngBuffers));

const exports = [
  { name: 'favicon-48.png', size: 48 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-512.png', size: 512 },
];

for (const { name, size } of exports) {
  const out = path.join(publicDir, name);
  await sharp(src)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: name.includes('apple') ? 1 : 0 },
    })
    .png()
    .toFile(out);
  console.log('Wrote', out);
}

console.log('Wrote', path.join(publicDir, 'favicon.ico'));
