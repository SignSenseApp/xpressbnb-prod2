// Minimal Razorpay typings. The full SDK is loaded via a <script> tag at
// runtime, but we only touch the constructor and a couple of instance
// methods. Keep this surface intentionally narrow — anything we haven't
// modelled stays unknown so the call site has to think before using it.

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
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export {};
