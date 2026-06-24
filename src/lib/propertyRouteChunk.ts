/** Shared dynamic import — AppRouter lazy + card prefetch resolve to one Vite chunk. */
export function loadPropertyPageModule() {
  return import('../pages/PropertyPage');
}
