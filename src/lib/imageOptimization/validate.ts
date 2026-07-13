import { ALLOWED_MIME_TYPES, MAX_INPUT_DIMENSION } from './constants';

export type ImageValidationResult =
  | { ok: true; detectedMime: string }
  | { ok: false; error: string };

const BLOCKED_EXTENSIONS = new Set(['svg', 'svgz']);

function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function looksLikeSvg(textSample: string): boolean {
  const trimmed = textSample.trimStart().slice(0, 512).toLowerCase();
  return trimmed.startsWith('<svg') || trimmed.includes('<svg');
}

export function isAllowedMimeType(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { ok: false, error: 'SVG images are not allowed for security reasons' };
  }

  if (file.type === 'image/svg+xml') {
    return { ok: false, error: 'SVG images are not allowed for security reasons' };
  }

  const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const textSample = new TextDecoder().decode(headerBytes);
  if (looksLikeSvg(textSample)) {
    return { ok: false, error: 'SVG images are not allowed for security reasons' };
  }

  const detectedMime = detectMimeFromBytes(headerBytes);
  if (!detectedMime) {
    return { ok: false, error: 'Unsupported or invalid image file' };
  }

  if (file.type && file.type !== detectedMime && file.type !== 'image/jpg' && detectedMime !== 'image/jpeg') {
    if (!isAllowedMimeType(file.type)) {
      return { ok: false, error: 'Only JPEG, PNG, WEBP, and GIF images are allowed' };
    }
  }

  if (!isAllowedMimeType(detectedMime) && !isAllowedMimeType(file.type)) {
    return { ok: false, error: 'Only JPEG, PNG, WEBP, and GIF images are allowed' };
  }

  return { ok: true, detectedMime: detectedMime || file.type };
}

export function validateImageDimensions(width: number, height: number): ImageValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, error: 'Invalid image dimensions' };
  }
  if (width > MAX_INPUT_DIMENSION || height > MAX_INPUT_DIMENSION) {
    return {
      ok: false,
      error: `Image dimensions exceed the maximum allowed size (${MAX_INPUT_DIMENSION}px)`,
    };
  }
  return { ok: true, detectedMime: '' };
}
