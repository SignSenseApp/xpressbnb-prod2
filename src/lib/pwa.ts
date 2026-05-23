/** PWA install helpers — service worker, platform detection, native install prompt */

const DISMISS_KEY = 'xpx_install_banner_dismissed_until';
const DISMISS_DAYS = 14;

export type InstallPlatform =
  | 'ios'
  | 'android'
  | 'desktop-chrome'
  | 'desktop-edge'
  | 'desktop-safari'
  | 'desktop-other';

export type InstallInstructionStep = {
  title: string;
  steps: string[];
  note?: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstall: BeforeInstallPromptEvent | null = null;
let installListenersAttached = false;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* non-fatal — site still works without SW */
    });
  });
}

export function attachInstallPromptListener(onAvailable?: () => void): void {
  if (installListenersAttached) return;
  installListenersAttached = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event as BeforeInstallPromptEvent;
    onAvailable?.();
    window.dispatchEvent(new Event('xpx-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    dismissInstallBanner();
  });
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

export function canNativeInstall(): boolean {
  return deferredInstall !== null;
}

export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstall) return 'unavailable';
  await deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  return outcome === 'accepted' ? 'accepted' : 'dismissed';
}

export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop-other';

  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';

  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !isEdge;
  const isSafari = /Safari\//.test(ua) && !isChrome && !isEdge;

  if (isChrome) return 'desktop-chrome';
  if (isEdge) return 'desktop-edge';
  if (isSafari) return 'desktop-safari';
  return 'desktop-other';
}

export function shouldShowInstallBanner(): boolean {
  if (isStandaloneApp()) return false;
  const until = localStorage.getItem(DISMISS_KEY);
  if (until && Date.now() < Number(until)) return false;
  return true;
}

export function dismissInstallBanner(): void {
  const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_KEY, String(until));
}

export const INSTALL_INSTRUCTIONS: Record<InstallPlatform, InstallInstructionStep> = {
  ios: {
    title: 'iPhone / iPad (Safari)',
    steps: [
      'Open www.xpressbnb.com in Safari (Chrome on iPhone does not support Add to Home Screen the same way).',
      'Tap the Share button at the bottom (square with an arrow).',
      'Scroll down and tap "Add to Home Screen".',
      'Tap Add — the XpressBnB icon appears on your home screen like an app.',
    ],
    note: 'Open the icon from your home screen for the full-screen app experience.',
  },
  android: {
    title: 'Android (Chrome)',
    steps: [
      'Open www.xpressbnb.com in Google Chrome.',
      'Tap the menu (⋮) in the top-right corner.',
      'Tap "Install app" or "Add to Home screen".',
      'Confirm Install — XpressBnB opens from your home screen without the browser bar.',
    ],
    note: 'If you see an Install banner on this page, tap Install for one-tap setup.',
  },
  'desktop-chrome': {
    title: 'Computer — Google Chrome',
    steps: [
      'Open www.xpressbnb.com in Chrome.',
      'Look for the install icon in the address bar (monitor with down arrow) and click Install.',
      'Or: menu (⋮) → "Install XpressBnB…" / "Save and share" → Install.',
      'The app opens in its own window and can be pinned to your taskbar.',
    ],
  },
  'desktop-edge': {
    title: 'Computer — Microsoft Edge',
    steps: [
      'Open www.xpressbnb.com in Edge.',
      'Click the App available icon in the address bar, or menu (⋯) → Apps → Install this site as an app.',
      'Confirm Install — pin it from the Start menu or taskbar.',
    ],
  },
  'desktop-safari': {
    title: 'Mac — Safari',
    steps: [
      'Open www.xpressbnb.com in Safari.',
      'From the menu bar: File → Add to Dock (macOS Sonoma or later).',
      'Or: Share → Add to Dock.',
      'Launch XpressBnB from the Dock like any other app.',
    ],
    note: 'Older Safari versions: bookmark the site or keep a pinned tab.',
  },
  'desktop-other': {
    title: 'Computer — other browser',
    steps: [
      'Open www.xpressbnb.com.',
      'In Chrome or Edge, use Install app from the address bar or browser menu.',
      'In Firefox, pin the tab or create a desktop shortcut to the site.',
    ],
  },
};

/** Plain-text blurb for WhatsApp / host onboarding messages */
export function getInstallShareMessage(): string {
  return [
    'Install XpressBnB on your phone (works like an app, no Play Store needed):',
    '',
    '📱 Android: Chrome → menu ⋮ → Install app / Add to Home screen',
    '🍎 iPhone: Safari → Share → Add to Home Screen',
    '💻 Laptop: Chrome/Edge → install icon in address bar → Install',
    '',
    'Site: https://www.xpressbnb.com',
  ].join('\n');
}
