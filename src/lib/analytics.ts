/** GA4 funnel events — no PII. Measurement ID is configured in index.html. */

export const GA4_MEASUREMENT_ID = 'G-HLZN3RJKTN';

export type XpressEventName =
  | 'property_view'
  | 'property_card_click'
  | 'city_page_view'
  | 'request_to_book_click'
  | 'booking_form_started'
  | 'otp_send_requested'
  | 'otp_send_success'
  | 'otp_verify_success'
  | 'otp_verify_failed'
  | 'inquiry_submit_started'
  | 'inquiry_submit_success'
  | 'inquiry_submit_failed'
  | 'inquiry_success'
  | 'host_whatsapp_click'
  | 'host_call_click'
  | 'property_load_failed'
  | 'pwa_update_available'
  | 'pwa_update_applied';

export type InquiryType = 'book_pay_later' | 'make_offer';

export type DeviceClass = 'mobile' | 'tablet' | 'desktop';
export type AppMode = 'browser' | 'standalone_pwa';

export type XpressEventParams = {
  property_id?: string;
  property_slug?: string;
  city?: string;
  inquiry_type?: InquiryType;
  source_route?: string;
  device_class?: DeviceClass;
  app_mode?: AppMode;
  booking_step?: string;
  error_category?: string;
  response_time_bucket?: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function getDeviceClass(): DeviceClass {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function getAppMode(): AppMode {
  if (typeof window === 'undefined') return 'browser';
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  ) {
    return 'standalone_pwa';
  }
  return 'browser';
}

export function bucketResponseMs(ms: number): string {
  if (ms < 1000) return 'under_1s';
  if (ms < 3000) return '1s_3s';
  if (ms < 8000) return '3s_8s';
  return 'over_8s';
}

export function categorizeBookingError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('date') || m.includes('check-in') || m.includes('check-out')) return 'dates';
  if (m.includes('phone') || m.includes('otp') || m.includes('verify')) return 'verification';
  if (m.includes('unavailable')) return 'availability';
  if (m.includes('schema') || m.includes('database')) return 'server_config';
  if (m.includes('payment') || m.includes('total')) return 'pricing';
  return 'unknown';
}

export function trackXpressEvent(
  name: XpressEventName,
  params?: Partial<XpressEventParams>,
): void {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    const payload: Record<string, string> = {
      device_class: getDeviceClass(),
      app_mode: getAppMode(),
      source_route: window.location.pathname,
    };

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          payload[key] = String(value);
        }
      }
    }

    window.gtag('event', name, {
      send_to: GA4_MEASUREMENT_ID,
      ...payload,
    });
  } catch {
    /* fail safely — analytics must never break booking */
  }
}

export type AnalyticsScope = Pick<
  XpressEventParams,
  'property_id' | 'property_slug' | 'city' | 'inquiry_type'
>;
