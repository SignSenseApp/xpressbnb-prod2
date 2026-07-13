import type { SupabaseClient } from '@supabase/supabase-js';
import type { OptimizeImageResult } from './constants';
import { withTimeout } from './asyncUtils';

const BUCKET = 'property-images';
const UPLOAD_TIMEOUT_MS = 60_000;

function toUploadError(error: { message?: string; statusCode?: string | number }): Error {
  const message = error.message ?? '';
  const code = String(error.statusCode ?? '');

  if (code === '409' || /already exists|duplicate/i.test(message)) {
    return new Error('Upload conflict. Please try again.');
  }
  if (code === '413' || /too large|exceeded.*size|payload/i.test(message)) {
    return new Error('Optimized image is still too large. Try a smaller photo.');
  }
  if (/network|fetch|failed to fetch|timeout/i.test(message) || code === '0') {
    return new Error('Network error. Check your connection and try again.');
  }
  if (/not allowed|mime|invalid/i.test(message)) {
    return new Error('Storage rejected this image type. Use JPEG, PNG, WEBP, or GIF.');
  }

  return new Error(message || 'Failed to upload image');
}

function isUploadConflict(error: { message?: string; statusCode?: string | number }): boolean {
  const message = error.message ?? '';
  const code = String(error.statusCode ?? '');
  return code === '409' || /already exists|duplicate/i.test(message);
}

function buildStorageFileName(passthrough: boolean): string {
  return passthrough ? `${crypto.randomUUID()}.gif` : `${crypto.randomUUID()}.webp`;
}

export async function uploadOptimizedPropertyImage(
  supabase: SupabaseClient,
  optimized: OptimizeImageResult,
): Promise<string> {
  if (!optimized.passthrough && optimized.contentType !== 'image/webp') {
    throw new Error('Internal error: non-GIF uploads must be WebP');
  }
  if (!optimized.fileName.endsWith(optimized.passthrough ? '.gif' : '.webp')) {
    throw new Error('Internal error: invalid optimized filename');
  }

  let fileName = optimized.fileName;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await withTimeout(
      supabase.storage.from(BUCKET).upload(fileName, optimized.blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: optimized.contentType,
      }),
      UPLOAD_TIMEOUT_MS,
      'Upload timed out. Check your connection and try again.',
    );

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
      return publicUrl;
    }

    if (attempt === 0 && isUploadConflict(error)) {
      fileName = buildStorageFileName(optimized.passthrough);
      continue;
    }

    throw toUploadError(error);
  }

  throw new Error('Failed to upload image');
}
