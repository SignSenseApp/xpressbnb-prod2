import { useEffect, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { theme } from '../lib/theme';

export interface ToastPayload {
  /** Unique key so duplicate toasts don't stack up. */
  id: string;
  title: string;
  body?: string;
  /** Auto dismiss after N ms. 0 means manual close only. */
  durationMs?: number;
}

/**
 * Tiny self-managed toast surface for the host dashboard. We avoid pulling in
 * a toast library because we only need bottom-right notifications for the
 * realtime "new offer received" event.
 */
export default function RealtimeToast({
  toast,
  onDismiss,
}: {
  toast: ToastPayload | null;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const ms = toast.durationMs ?? 6000;
    if (ms <= 0) return;
    const t = setTimeout(() => {
      setVisible(false);
      // give exit animation time before fully unmounting through parent.
      setTimeout(onDismiss, 250);
    }, ms);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[80] max-w-sm transition-all"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="rounded-2xl p-4 shadow-xl flex items-start gap-3"
        style={{
          background:
            'linear-gradient(135deg, rgba(80,200,120,0.12) 0%, #FFFFFF 70%)',
          border: '1px solid rgba(80,200,120,0.45)',
          boxShadow: '0 16px 48px rgba(15,23,42,0.10)',
        }}
      >
        <div
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: 'rgba(80,200,120,0.18)' }}
        >
          <Tag className="w-4 h-4" style={{ color: theme.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-xpx-text">{toast.title}</p>
          {toast.body && (
            <p className="text-xs text-xpx-muted mt-0.5">{toast.body}</p>
          )}
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 250);
          }}
          className="p-1 rounded-lg text-xpx-muted hover:text-xpx-text hover:bg-slate-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
