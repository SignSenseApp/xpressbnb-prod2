/** Longest edge for stored property photos (never upscale). */
export const MAX_OUTPUT_EDGE = 1920;

/** Input dimension guard — prevents canvas memory exhaustion. */
export const MAX_INPUT_DIMENSION = 30_000;

/** Original file size that triggers harder compression. */
export const LARGE_INPUT_BYTES = 8 * 1024 * 1024;

/** Supabase bucket file size limit. */
export const BUCKET_MAX_BYTES = 5 * 1024 * 1024;

/** Target max output for typical property photos. */
export const TARGET_NORMAL_BYTES = 450 * 1024;

/** Target max for large / luxury photos (long edge near max or heavy originals). */
export const TARGET_LUXURY_BYTES = 700 * 1024;

export const DEFAULT_QUALITY = 0.8;
export const LARGE_INPUT_QUALITY = 0.65;
export const TRANSPARENT_QUALITY = 0.95;
export const MIN_QUALITY = 0.45;
export const BUCKET_FLOOR_QUALITY = 0.35;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export type OptimizationStage = 'preparing' | 'optimizing' | 'uploading' | 'done';

export type OptimizeImageResult = {
  blob: Blob;
  fileName: string;
  contentType: string;
  passthrough: boolean;
  previewUrl: string;
  originalBytes: number;
  optimizedBytes: number;
};
