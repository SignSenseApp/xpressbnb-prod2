import { BUCKET } from './constants.mjs';

const OBJECT_PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const RENDER_PREFIX = `/storage/v1/render/image/public/${BUCKET}/`;

/**
 * @param {string} url
 * @returns {{ bucket: string, path: string, objectUrl: string } | null}
 */
export function parseSupabasePropertyImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    let storagePath = null;

    if (parsed.pathname.includes(OBJECT_PREFIX)) {
      storagePath = decodeURIComponent(parsed.pathname.split(OBJECT_PREFIX)[1] ?? '');
    } else if (parsed.pathname.includes(RENDER_PREFIX)) {
      storagePath = decodeURIComponent(parsed.pathname.split(RENDER_PREFIX)[1] ?? '');
    }

    if (!storagePath) return null;

    const objectUrl = `${parsed.origin}${OBJECT_PREFIX}${encodeURIComponent(storagePath).replace(/%2F/g, '/')}`;
    // encodeURIComponent over-encodes slashes; paths are flat filenames in this bucket
    const flatPath = storagePath.split('?')[0];
    const cleanObjectUrl = `${parsed.origin}${OBJECT_PREFIX}${flatPath}`;

    return {
      bucket: BUCKET,
      path: flatPath,
      objectUrl: cleanObjectUrl,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} path
 */
export function isAlreadyOptimizedWebp(path) {
  return /\.webp$/i.test(path);
}

/**
 * @param {string} url
 */
export function isExternalImageUrl(url) {
  return parseSupabasePropertyImageUrl(url) === null;
}
