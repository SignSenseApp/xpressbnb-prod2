import { optimizePropertyImage, type ProgressCallback } from './optimize';

type WorkerRequest = {
  id: string;
  file: File;
};

type WorkerResponse =
  | { id: string; type: 'progress'; stage: 'preparing' | 'optimizing' | 'uploading' | 'done' }
  | {
      id: string;
      type: 'done';
      blob: Blob;
      fileName: string;
      contentType: string;
      passthrough: boolean;
      originalBytes: number;
      optimizedBytes: number;
    }
  | { id: string; type: 'error'; message: string };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, file } = event.data;
  const onProgress: ProgressCallback = (stage) => {
    const message: WorkerResponse = { id, type: 'progress', stage };
    self.postMessage(message);
  };

  try {
    const result = await optimizePropertyImage(file, onProgress, { omitPreviewUrl: true });
    const message: WorkerResponse = {
      id,
      type: 'done',
      blob: result.blob,
      fileName: result.fileName,
      contentType: result.contentType,
      passthrough: result.passthrough,
      originalBytes: result.originalBytes,
      optimizedBytes: result.optimizedBytes,
    };
    self.postMessage(message);
  } catch (error) {
    const message: WorkerResponse = {
      id,
      type: 'error',
      message: error instanceof Error ? error.message : 'Image optimization failed',
    };
    self.postMessage(message);
  }
};
