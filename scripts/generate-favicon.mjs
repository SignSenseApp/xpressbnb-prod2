import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', 'main-xpx-logo.png');
const out = path.join(root, 'public', 'favicon.ico');
const appleOut = path.join(root, 'public', 'apple-touch-icon.png');

const sizes = [16, 32, 48];
const pngBuffers = await Promise.all(
  sizes.map((s) =>
    sharp(src)
      .resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  )
);

const buf = await pngToIco(pngBuffers);
fs.writeFileSync(out, buf);
console.log('Wrote', out, `(${buf.length} bytes) from`, src);

await sharp(src)
  .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .png()
  .toFile(appleOut);
console.log('Wrote', appleOut);
