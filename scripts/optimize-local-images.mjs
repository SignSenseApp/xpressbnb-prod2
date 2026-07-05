/**
 * Optimize local marketing/onboarding images in public/images.
 *
 * The source photos are multi-megabyte camera JPEGs; they render at
 * ≤820 CSS px (how-it-works cards) and ≤1040 px (welcome modal hero).
 * This script emits WebP variants used via <picture> and rewrites the
 * JPEG fallback in place at the max needed width.
 *
 * Run after replacing any image in public/images:
 *   node scripts/optimize-local-images.mjs
 */
import sharp from 'sharp';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';

const PUBLIC = resolve(process.cwd(), 'public');

const TARGETS = [
  { file: 'images/trust/how-it-works-explore.jpg', widths: [800, 1200] },
  { file: 'images/trust/how-it-works-inquiry.jpg', widths: [800, 1200] },
  { file: 'images/trust/how-it-works-confirm.jpg', widths: [800, 1200] },
  { file: 'images/onboarding/welcome-hero.jpg', widths: [640, 1040] },
];

const WEBP_QUALITY = 78;
const JPEG_QUALITY = 80;

for (const { file, widths } of TARGETS) {
  const src = resolve(PUBLIC, file);
  const before = statSync(src).size;
  const input = await sharp(src).toBuffer();
  const maxWidth = Math.max(...widths);

  for (const width of widths) {
    const out = src.replace(/\.jpg$/, width === maxWidth ? '.webp' : `-${width}.webp`);
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(out);
  }

  await sharp(input)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(src);

  const after = statSync(src).size;
  console.log(
    `${file}: ${(before / 1024 / 1024).toFixed(2)}MB -> jpg ${(after / 1024).toFixed(0)}KB + webp x${widths.length}`,
  );
}
