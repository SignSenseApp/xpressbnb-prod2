import { BUCKET } from '../property-image-migration/constants.mjs';
import { parseSupabasePropertyImageUrl } from '../property-image-migration/urlParser.mjs';

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const BUCKET_MAX_BYTES = 5 * 1024 * 1024;

/**
 * @param {string} path
 */
export function extensionOf(path) {
  const base = path.split('/').pop() ?? path;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot + 1).toLowerCase();
}

/**
 * @param {string} path
 */
export function hasMissingExtension(path) {
  const base = path.split('/').pop() ?? path;
  return !base.includes('.') || extensionOf(path) === '';
}

/**
 * @param {string} url
 * @returns {'pexels' | 'unsplash' | 'supabase-other' | 'other-https' | 'invalid' | null}
 */
export function classifyExternalUrl(url) {
  const parsed = parseSupabasePropertyImageUrl(url);
  if (parsed) return null;

  try {
    const u = new URL(url.trim());
    if (!/^https?:$/i.test(u.protocol)) return 'invalid';
    const host = u.hostname.toLowerCase();
    if (host.includes('pexels.com')) return 'pexels';
    if (host.includes('unsplash.com')) return 'unsplash';
    if (host.includes('supabase.co') || host.includes('supabase.in')) return 'supabase-other';
    return 'other-https';
  } catch {
    return 'invalid';
  }
}

/**
 * Estimate post-migration bytes for legacy raster images (heuristic, read-only).
 * @param {number} bytes
 * @param {string} ext
 */
export function estimateMigratedBytes(bytes, ext) {
  const normalized = ext.toLowerCase();
  if (normalized === 'webp' || normalized === 'gif') return bytes;
  if (normalized !== 'jpg' && normalized !== 'jpeg' && normalized !== 'png') return bytes;

  if (bytes > 2_000_000) return Math.min(Math.round(bytes * 0.12), 700_000);
  if (bytes > 500_000) return Math.min(Math.round(bytes * 0.18), 450_000);
  if (bytes > 100_000) return Math.round(bytes * 0.35);
  return Math.max(Math.round(bytes * 0.55), 80_000);
}

/**
 * @param {number[]} values
 */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

/**
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * @param {object} objectMeta
 * @param {string} path
 */
export function flagSuspiciousObject(objectMeta, path) {
  const flags = [];
  const size = objectMeta?.metadata?.size ?? objectMeta?.size ?? 0;
  const mime = (objectMeta?.metadata?.mimetype ?? objectMeta?.mimetype ?? '').toLowerCase();
  const ext = extensionOf(path);

  if (size === 0) flags.push('zero-byte');
  if (size > BUCKET_MAX_BYTES) flags.push('oversized');
  if (hasMissingExtension(path)) flags.push('missing-extension');
  if (ext && !SUPPORTED_EXTENSIONS.has(ext)) flags.push('unsupported-extension');
  if (mime && !mime.startsWith('image/')) flags.push('invalid-mime');
  if (mime === 'image/svg+xml') flags.push('unsupported-svg');

  return flags;
}

export { BUCKET, SUPPORTED_EXTENSIONS };
