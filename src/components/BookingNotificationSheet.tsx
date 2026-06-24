import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { isPushSupported, subscribeToPushNotifications } from '../lib/pushSubscription';

interface BookingNotificationSheetProps {
  bookingId: string;
  isVisible: boolean;
  onDismiss: () => void;
}

export default function BookingNotificationSheet({
  bookingId,
  isVisible,
  onDismiss,
}: BookingNotificationSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      onDismiss();
    }
  }, [onDismiss]);

  useEffect(() => {
    if (isVisible && isPushSupported()) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setSlideIn(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setSlideIn(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setSuccess(false);
      setEnabling(false);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [isVisible]);

  if (!mounted || !isPushSupported()) return null;

  const handleMaybeLater = () => {
    try {
      localStorage.setItem('xbnb_notif_dismissed', 'true');
    } catch {
      /* non-fatal */
    }
    onDismiss();
  };

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        onDismiss();
        return;
      }

      const subscribed = await subscribeToPushNotifications(bookingId);
      if (!subscribed) {
        onDismiss();
        return;
      }

      setSuccess(true);
      window.setTimeout(() => onDismiss(), 1000);
    } catch {
      onDismiss();
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
      role="region"
      aria-label="Notification preferences"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.12)] transition-transform duration-300 ease-out"
        style={{
          transform: slideIn ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex justify-center pt-2.5 pb-0" aria-hidden>
          <div className="h-1 w-9 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 pt-3 pb-5 sm:px-6">
          {success ? (
            <p className="text-center text-base font-semibold text-emerald-700 py-4">
              You&apos;re set ✓
            </p>
          ) : (
            <>
              <div className="flex items-start gap-3.5">
                <div
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full mt-0.5"
                  style={{ background: '#ecfdf5', color: '#059669' }}
                  aria-hidden
                >
                  <Bell className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-[19px] font-bold tracking-tight text-xpx-text leading-snug">
                    Stay in the loop
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-xpx-muted">
                    Get notified when your host confirms. One tap. No spam.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={enabling}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl text-[15px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors active:opacity-90"
                >
                  {enabling ? 'Enabling…' : 'Enable notifications'}
                </button>
                <button
                  type="button"
                  onClick={handleMaybeLater}
                  disabled={enabling}
                  className="py-2 text-xs font-medium text-xpx-muted hover:text-xpx-text transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
