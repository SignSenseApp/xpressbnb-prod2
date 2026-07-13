/** Detect animated GIFs — static GIFs can be optimized; animated GIFs pass through unchanged. */
export async function isAnimatedGif(file: File): Promise<boolean> {
  if (file.type !== 'image/gif' && !file.name.toLowerCase().endsWith('.gif')) {
    return false;
  }

  const sampleSize = Math.min(file.size, 128 * 1024);
  const bytes = new Uint8Array(await file.slice(0, sampleSize).arrayBuffer());

  let graphicControlCount = 0;
  for (let i = 0; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) {
      graphicControlCount += 1;
      if (graphicControlCount > 1) return true;
    }
  }

  return false;
}
