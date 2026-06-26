// npx web-push generate-vapid-keys

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

export function getVisitorSessionId(): string {
  let sessionId = sessionStorage.getItem('visitor_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('visitor_session_id', sessionId);
  }
  return sessionId;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!existing) {
      await navigator.serviceWorker.register('/sw.js');
    }
    return navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function persistSubscriptionLocally(
  bookingId: string,
  customerReference: string,
  subscription: PushSubscription,
): Promise<void> {
  const subscriptionJson = subscription.toJSON();
  const userSessionId = getVisitorSessionId();

  try {
    localStorage.setItem(
      'xbnb_push_sub',
      JSON.stringify({
        user_session_id: userSessionId,
        booking_id: bookingId,
        customer_reference: customerReference,
        subscription_json: subscriptionJson,
        created_at: new Date().toISOString(),
      }),
    );
  } catch {
    /* non-fatal */
  }
}

async function persistSubscriptionRemote(
  customerReference: string,
  guestEmail: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  await supabase.rpc('save_guest_push_subscription', {
    p_customer_reference: customerReference,
    p_guest_email: guestEmail,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth_key: json.keys.auth,
    p_notification_preferences: { status_updates: true },
  });
}

/** @deprecated Use subscribeToInquiryPushNotifications */
export async function subscribeToPushNotifications(bookingId: string): Promise<boolean> {
  return subscribeToInquiryPushNotifications('', '', bookingId);
}

export async function subscribeToInquiryPushNotifications(
  customerReference: string,
  guestEmail: string,
  bookingId: string,
): Promise<boolean> {
  if (!isPushSupported()) return false;

  const vapidKey = VAPID_PUBLIC_KEY?.trim();
  if (!vapidKey || vapidKey === 'your_key_here') {
    return false;
  }

  const registration = await ensureServiceWorkerReady();
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await persistSubscriptionLocally(bookingId, customerReference, subscription);

    if (customerReference && guestEmail) {
      try {
        await persistSubscriptionRemote(customerReference, guestEmail, subscription);
      } catch {
        /* graceful fallback — local only */
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function requestAndSubscribeInquiryPush(
  customerReference: string,
  guestEmail: string,
  bookingId: string,
): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission === 'denied') return false;

  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return false;
  }

  return subscribeToInquiryPushNotifications(customerReference, guestEmail, bookingId);
}
