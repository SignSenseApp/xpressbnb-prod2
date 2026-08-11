import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const files = [
  {
    input: 'C:\\Users\\Asus\\.cursor\\projects\\d-xpx\\assets\\dpiit-emblem-transparent.png',
    output: 'd:\\xpx\\project\\public\\images\\institutional\\dpiit-emblem.png',
  },
  {
    input: 'C:\\Users\\Asus\\.cursor\\projects\\d-xpx\\assets\\iit-roorkee-emblem-transparent.png',
    output: 'd:\\xpx\\project\\public\\images\\institutional\\iit-roorkee-emblem.png',
  },
];

function shouldMakeTransparent(r, g, b, a) {
  if (a < 10) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;
  const avg = (r + g + b) / 3;
  // Checkerboard / white studio backgrounds.
  if (avg >= 198 && spread <= 28) return true;
  if (avg >= 175 && spread <= 12) return true;
  // Solid black matte backgrounds from generated assets.
  if (avg <= 18 && spread <= 12) return true;
  return false;
}

for (const { input, output } of files) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (shouldMakeTransparent(r, g, b, a)) {
      data[i + 3] = 0;
    }
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 10 })
    .png()
    .toFile(output);
  console.log(`Wrote ${output}`);
}
