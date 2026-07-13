import { describe, expect, it } from 'vitest';
import { computeBatchUploadPercent } from './progress';

describe('computeBatchUploadPercent', () => {
  it('returns 0 for empty batch', () => {
    expect(computeBatchUploadPercent(0, 0, 'preparing')).toBe(0);
  });

  it('reaches 100% on final file done stage', () => {
    expect(computeBatchUploadPercent(2, 3, 'done')).toBe(100);
  });

  it('increases monotonically across stages for a single file', () => {
    const preparing = computeBatchUploadPercent(0, 1, 'preparing');
    const optimizing = computeBatchUploadPercent(0, 1, 'optimizing');
    const uploading = computeBatchUploadPercent(0, 1, 'uploading');
    const done = computeBatchUploadPercent(0, 1, 'done');
    expect(preparing).toBeLessThan(optimizing);
    expect(optimizing).toBeLessThan(uploading);
    expect(uploading).toBeLessThan(done);
    expect(done).toBe(100);
  });

  it('weights later files higher in a batch', () => {
    const first = computeBatchUploadPercent(0, 2, 'uploading');
    const second = computeBatchUploadPercent(1, 2, 'uploading');
    expect(second).toBeGreaterThan(first);
  });
});
