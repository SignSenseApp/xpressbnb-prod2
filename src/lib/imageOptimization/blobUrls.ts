/** Track and revoke blob: preview URLs to avoid memory leaks. */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('blob:');
}

export function containsBlobPreviewUrls(urls: readonly string[]): boolean {
  return urls.some(isBlobUrl);
}

export function revokeBlobUrl(url: string): void {
  if (isBlobUrl(url)) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Revoke after React has painted the replacement src (public URL).
 * Double rAF avoids a flash of broken image on fast revoke.
 */
export function deferRevokeBlobUrl(url: string): void {
  if (!isBlobUrl(url)) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => revokeBlobUrl(url));
  });
}
