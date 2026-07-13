/** Mirror browser upload pipeline limits (src/lib/imageOptimization/constants.ts). */
export const BUCKET = 'property-images';
export const MAX_OUTPUT_EDGE = 1920;
export const LARGE_INPUT_BYTES = 8 * 1024 * 1024;
export const BUCKET_MAX_BYTES = 5 * 1024 * 1024;
export const TARGET_NORMAL_BYTES = 450 * 1024;
export const TARGET_LUXURY_BYTES = 700 * 1024;
export const DEFAULT_QUALITY = 80;
export const LARGE_INPUT_QUALITY = 65;
export const TRANSPARENT_QUALITY = 95;
export const MIN_QUALITY = 45;
export const BUCKET_FLOOR_QUALITY = 35;

export const STATE_VERSION = 1;
export const DEFAULT_STATE_FILE = '.migration-state/property-images-migration.json';
