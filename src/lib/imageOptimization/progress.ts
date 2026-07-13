import type { OptimizationStage } from './constants';

/** Per-file stage weights for batch upload percent (0–100). */
const STAGE_WEIGHT: Record<OptimizationStage, number> = {
  preparing: 0.15,
  optimizing: 0.55,
  uploading: 0.9,
  done: 1,
};

export function computeBatchUploadPercent(
  fileIndex: number,
  totalFiles: number,
  stage: OptimizationStage,
): number {
  if (totalFiles <= 0) return 0;
  const fileProgress = STAGE_WEIGHT[stage];
  const raw = ((fileIndex + fileProgress) / totalFiles) * 100;
  return Math.min(100, Math.round(raw));
}
