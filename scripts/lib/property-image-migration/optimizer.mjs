import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  BUCKET_FLOOR_QUALITY,
  BUCKET_MAX_BYTES,
  DEFAULT_QUALITY,
  LARGE_INPUT_BYTES,
  LARGE_INPUT_QUALITY,
  MAX_OUTPUT_EDGE,
  MIN_QUALITY,
  TARGET_LUXURY_BYTES,
  TARGET_NORMAL_BYTES,
  TRANSPARENT_QUALITY,
} from './constants.mjs';

/**
 * @param {Buffer} buffer
 */
export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * @param {import('sharp').Metadata} metadata
 */
export function isAnimatedImage(metadata) {
  return metadata.format === 'gif' && (metadata.pages ?? 1) > 1;
}

/**
 * @param {Buffer} inputBuffer
 * @returns {Promise<{ skip: true, reason: string } | { skip: false, buffer: Buffer, bytes: number, hash: string, quality: number }>}
 */
export async function optimizePropertyImageBuffer(inputBuffer) {
  const metadata = await sharp(inputBuffer, { animated: true }).metadata();

  if (isAnimatedImage(metadata)) {
    return { skip: true, reason: 'animated-gif' };
  }

  const originalBytes = inputBuffer.length;
  const isLargeInput = originalBytes > LARGE_INPUT_BYTES;
  const outputLongestEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const targetMax =
    isLargeInput || outputLongestEdge >= 1800 ? TARGET_LUXURY_BYTES : TARGET_NORMAL_BYTES;

  let pipeline = sharp(inputBuffer, { animated: false }).rotate();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longest = Math.max(width, height);
  if (longest > MAX_OUTPUT_EDGE) {
    pipeline = pipeline.resize({
      width: width >= height ? MAX_OUTPUT_EDGE : undefined,
      height: height > width ? MAX_OUTPUT_EDGE : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const hasAlpha = metadata.hasAlpha === true;
  let quality = hasAlpha ? TRANSPARENT_QUALITY : DEFAULT_QUALITY;
  if (isLargeInput) {
    quality = Math.min(quality, LARGE_INPUT_QUALITY);
  }

  const encode = async (q) => {
    let p = sharp(inputBuffer, { animated: false }).rotate();
    if (longest > MAX_OUTPUT_EDGE) {
      p = p.resize({
        width: width >= height ? MAX_OUTPUT_EDGE : undefined,
        height: height > width ? MAX_OUTPUT_EDGE : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    return p.webp({ quality: q }).toBuffer();
  };

  let output = await encode(quality);

  while (output.length > targetMax && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 5);
    output = await encode(quality);
  }

  while (output.length > BUCKET_MAX_BYTES && quality > BUCKET_FLOOR_QUALITY) {
    quality = Math.max(BUCKET_FLOOR_QUALITY, quality - 5);
    output = await encode(quality);
  }

  if (output.length > BUCKET_MAX_BYTES) {
    throw new Error('Unable to compress image sufficiently for upload');
  }

  return {
    skip: false,
    buffer: output,
    bytes: output.length,
    hash: sha256(output),
    quality,
  };
}
