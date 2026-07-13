import type { OptimizeImageResult, OptimizationStage } from './constants';
import { withTimeout } from './asyncUtils';
import { optimizePropertyImage } from './optimize';

export type OptimizeProgressCallback = (stage: OptimizationStage) => void;

const OPTIMIZE_TIMEOUT_MS = 120_000;

let worker: Worker | null = null;
let requestCounter = 0;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function terminateOptimizationWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

function optimizeInWorker(file: File, onProgress?: OptimizeProgressCallback): Promise<OptimizeImageResult> {
  const activeWorker = getWorker();
  if (!activeWorker) {
    return optimizePropertyImage(file, onProgress);
  }

  const id = `img-${++requestCounter}`;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      activeWorker.removeEventListener('message', handleMessage);
      activeWorker.removeEventListener('error', handleError);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.id !== id) return;

      if (data.type === 'progress') {
        onProgress?.(data.stage);
        return;
      }

      cleanup();

      if (data.type === 'error') {
        reject(new Error(data.message));
        return;
      }

      const previewUrl = URL.createObjectURL(data.blob);
      resolve({
        blob: data.blob,
        fileName: data.fileName,
        contentType: data.contentType,
        passthrough: data.passthrough,
        previewUrl,
        originalBytes: data.originalBytes,
        optimizedBytes: data.optimizedBytes,
      });
    };

    const handleError = () => {
      cleanup();
      optimizePropertyImage(file, onProgress).then(resolve).catch(reject);
    };

    activeWorker.addEventListener('message', handleMessage);
    activeWorker.addEventListener('error', handleError);
    activeWorker.postMessage({ id, file });
  });
}

export async function optimizePropertyImageClient(
  file: File,
  onProgress?: OptimizeProgressCallback,
): Promise<OptimizeImageResult> {
  const optimize = async () => {
    try {
      return await optimizeInWorker(file, onProgress);
    } catch {
      return optimizePropertyImage(file, onProgress);
    }
  };

  return withTimeout(
    optimize(),
    OPTIMIZE_TIMEOUT_MS,
    'Image optimization timed out. Try a smaller photo or check your connection.',
  );
}
