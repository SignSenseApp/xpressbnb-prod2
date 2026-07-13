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
  type OptimizeImageResult,
  type OptimizationStage,
} from './constants';
import { isAnimatedGif } from './gif';
import { validateImageDimensions, validateImageFile } from './validate';

export type ProgressCallback = (stage: OptimizationStage) => void;

function computeOutputDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_OUTPUT_EDGE) {
    return { width, height };
  }
  const scale = MAX_OUTPUT_EDGE / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function sampleHasTransparency(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const sampleW = Math.min(width, 64);
  const sampleH = Math.min(height, 64);
  const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
  const { data } = imageData;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser does not support image processing. Please update your browser.');
  }

  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return await createImageBitmap(file);
  }
}

function createCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser');
    return { canvas, ctx };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');
  return { canvas, ctx };
}

async function canvasToWebp(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/webp', quality });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('WebP encoding failed'))),
      'image/webp',
      quality,
    );
  });
}

async function encodeWithAdaptiveQuality(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: {
    hasAlpha: boolean;
    isLargeInput: boolean;
    outputLongestEdge: number;
  },
): Promise<Blob> {
  const targetMax =
    options.isLargeInput || options.outputLongestEdge >= 1800
      ? TARGET_LUXURY_BYTES
      : TARGET_NORMAL_BYTES;

  let quality = options.hasAlpha ? TRANSPARENT_QUALITY : DEFAULT_QUALITY;
  if (options.isLargeInput) {
    quality = Math.min(quality, LARGE_INPUT_QUALITY);
  }

  let blob = await canvasToWebp(canvas, quality);

  while (blob.size > targetMax && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.05);
    blob = await canvasToWebp(canvas, quality);
  }

  while (blob.size > BUCKET_MAX_BYTES && quality > BUCKET_FLOOR_QUALITY) {
    quality = Math.max(BUCKET_FLOOR_QUALITY, quality - 0.05);
    blob = await canvasToWebp(canvas, quality);
  }

  if (blob.size > BUCKET_MAX_BYTES) {
    throw new Error('Unable to compress image sufficiently for upload');
  }

  return blob;
}

function buildFileName(extension: 'webp' | 'gif'): string {
  return `${crypto.randomUUID()}.${extension}`;
}

export type OptimizePropertyImageOptions = {
  /** Worker path creates preview URLs on the main thread only. */
  omitPreviewUrl?: boolean;
};

export async function optimizePropertyImage(
  file: File,
  onProgress?: ProgressCallback,
  options?: OptimizePropertyImageOptions,
): Promise<OptimizeImageResult> {
  onProgress?.('preparing');

  const validation = await validateImageFile(file);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const originalBytes = file.size;
  const isLargeInput = originalBytes > LARGE_INPUT_BYTES;

  if (await isAnimatedGif(file)) {
    onProgress?.('optimizing');
    const previewUrl = options?.omitPreviewUrl ? '' : URL.createObjectURL(file);
    onProgress?.('done');
    return {
      blob: file,
      fileName: buildFileName('gif'),
      contentType: 'image/gif',
      passthrough: true,
      previewUrl,
      originalBytes,
      optimizedBytes: file.size,
    };
  }

  onProgress?.('optimizing');

  const bitmap = await loadImageBitmap(file);
  try {
    const dimensionCheck = validateImageDimensions(bitmap.width, bitmap.height);
    if (!dimensionCheck.ok) {
      throw new Error(dimensionCheck.error);
    }

    const { width, height } = computeOutputDimensions(bitmap.width, bitmap.height);
    const { canvas, ctx } = createCanvas(width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const hasAlpha = sampleHasTransparency(ctx, width, height);
    const outputLongestEdge = Math.max(width, height);

    const blob = await encodeWithAdaptiveQuality(canvas, {
      hasAlpha,
      isLargeInput,
      outputLongestEdge,
    });

    const previewUrl = options?.omitPreviewUrl ? '' : URL.createObjectURL(blob);
    onProgress?.('done');

    return {
      blob,
      fileName: buildFileName('webp'),
      contentType: 'image/webp',
      passthrough: false,
      previewUrl,
      originalBytes,
      optimizedBytes: blob.size,
    };
  } finally {
    bitmap.close();
  }
}
