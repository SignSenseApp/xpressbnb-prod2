// npx web-push generate-vapid-keys

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

async function persistSubscription(
  bookingId: string,
  subscription: PushSubscription,
): Promise<void> {
  const subscriptionJson = subscription.toJSON();
  const userSessionId = getVisitorSessionId();

  // TODO: migrate to Supabase push_subscriptions table once created in migrations
  try {
    localStorage.setItem(
      'xbnb_push_sub',
      JSON.stringify({
        user_session_id: userSessionId,
        booking_id: bookingId,
        subscription_json: subscriptionJson,
        created_at: new Date().toISOString(),
      }),
    );
  } catch {
    /* non-fatal */
  }
}

// TODO: server sends push via web-push library
// when host responds in host dashboard
// Trigger: host marks inquiry as 'responded' in BookingsPage.tsx

export async function subscribeToPushNotifications(bookingId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  const vapidKey = VAPID_PUBLIC_KEY?.trim();
  if (!vapidKey || vapidKey === 'your_key_here') return false;

  const registration = await ensureServiceWorkerReady();
  if (!registration) return false;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await persistSubscription(bookingId, subscription);
    return true;
  } catch {
    return false;
  }
}
