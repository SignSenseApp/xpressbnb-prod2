import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  disabled?: boolean;
};

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile failed to load'));
    document.head.appendChild(script);
  });
}

export default function TurnstileWidget({ onToken, disabled = false }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (disabled) return;

    const siteKey = SITE_KEY?.trim();
    const isDev = import.meta.env.DEV;

    if (!siteKey) {
      if (isDev) {
        onToken('dev-bypass');
      } else {
        setLoadError(true);
        onToken(null);
      }
      return;
    }

    let cancelled = false;

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          onToken(null);
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [disabled, onToken]);

  if (import.meta.env.DEV && !SITE_KEY?.trim()) {
    return (
      <p className="text-[11px] text-xpx-subtle text-center" aria-live="polite">
        Security check ready (development)
      </p>
    );
  }

  if (!SITE_KEY?.trim()) {
    return (
      <p className="text-xs text-red-700 text-center bg-red-50 border border-red-200 rounded-xl px-3 py-2" role="alert">
        Security check is unavailable. Please try again later.
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-xs text-amber-800 text-center" role="status">
        Security check unavailable — please refresh and try again.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center min-h-[65px]"
      aria-label="Security verification"
    />
  );
}
