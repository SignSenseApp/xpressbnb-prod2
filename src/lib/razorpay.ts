// Minimal Razorpay typings + lazy script loader.
//
// The full SDK is fetched on demand (first host checkout click), not from
// index.html, so guest pages never download checkout.js or trigger
// Razorpay's risk-detection iframe / API ping.

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
}

export interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: () => void): void;
  on(event: string, handler: (payload?: unknown) => void): void;
}

export type RazorpayOptions = Record<string, unknown>;

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let pendingLoad: Promise<void> | null = null;

/**
 * Inject the Razorpay checkout SDK once and resolve when `window.Razorpay`
 * is available. Subsequent calls return the same promise (or resolve
 * immediately if already loaded).
 *
 * Safe to call from any host-only code path. Never call from guest UI.
 */
export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be loaded in the browser'));
  }

  if (window.Razorpay) return Promise.resolve();
  if (pendingLoad) return pendingLoad;

  pendingLoad = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SRC}"]`,
    );

    const handleReady = () => {
      if (window.Razorpay) resolve();
      else reject(new Error('Razorpay loaded but constructor missing'));
    };

    const handleError = () => {
      pendingLoad = null;
      reject(new Error('Could not load Razorpay checkout'));
    };

    if (existing) {
      // Another caller already injected the tag — wait for it.
      existing.addEventListener('load', handleReady, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = handleReady;
    script.onerror = handleError;
    document.head.appendChild(script);
  });

  return pendingLoad;
}
