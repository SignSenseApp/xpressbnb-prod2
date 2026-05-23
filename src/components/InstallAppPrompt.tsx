import { useCallback, useEffect, useState } from 'react';
import { Download, Smartphone, X, Copy, Check, Monitor } from 'lucide-react';
import {
  attachInstallPromptListener,
  canNativeInstall,
  dismissInstallBanner,
  getInstallPlatform,
  getInstallShareMessage,
  INSTALL_INSTRUCTIONS,
  isStandaloneApp,
  shouldShowInstallBanner,
  triggerNativeInstall,
  type InstallPlatform,
} from '../lib/pwa';

type InstallAppPromptProps = {
  /** Hide on dense flows (checkout, host dashboard optional) */
  hidden?: boolean;
};

function PlatformTabs({
  platform,
  onSelect,
}: {
  platform: InstallPlatform;
  onSelect: (p: InstallPlatform) => void;
}) {
  const tabs: { id: InstallPlatform; label: string }[] = [
    { id: 'android', label: 'Android' },
    { id: 'ios', label: 'iPhone' },
    { id: 'desktop-chrome', label: 'Laptop' },
  ];

  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
          style={{
            background: platform === tab.id ? 'var(--xpx-warm)' : 'var(--xpx-surface-light)',
            color: platform === tab.id ? '#fff' : 'var(--xpx-muted)',
            border: `1px solid ${platform === tab.id ? 'transparent' : 'var(--xpx-border)'}`,
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function InstallAppHelpModal({
  open,
  onClose,
  initialPlatform,
}: {
  open: boolean;
  onClose: () => void;
  initialPlatform?: InstallPlatform;
}) {
  const [platform, setPlatform] = useState<InstallPlatform>(
    initialPlatform ?? getInstallPlatform(),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setPlatform(initialPlatform ?? getInstallPlatform());
    }
  }, [open, initialPlatform]);

  if (!open) return null;

  const info = INSTALL_INSTRUCTIONS[platform];

  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(getInstallShareMessage());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Install XpressBnB app"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90svh] overflow-y-auto"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
        }}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="xpx-eyebrow">Install app</p>
              <h2 className="text-xl font-extrabold text-xpx-text tracking-tight">
                Add XpressBnB to your device
              </h2>
              <p className="text-sm text-xpx-muted mt-1">
                No Play Store or App Store — opens like an app from your home screen or taskbar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-xpx-muted"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <PlatformTabs platform={platform} onSelect={setPlatform} />

          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
          >
            <h3 className="font-bold text-xpx-text text-sm mb-3 flex items-center gap-2">
              {platform === 'ios' || platform === 'android' ? (
                <Smartphone className="w-4 h-4" style={{ color: 'var(--xpx-warm)' }} />
              ) : (
                <Monitor className="w-4 h-4" style={{ color: 'var(--xpx-warm)' }} />
              )}
              {info.title}
            </h3>
            <ol className="space-y-2 list-decimal list-inside text-sm text-xpx-text leading-relaxed">
              {info.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {info.note && (
              <p className="text-xs text-xpx-muted mt-3 pt-3 border-t border-xpx-border">{info.note}</p>
            )}
          </div>

          <button
            type="button"
            onClick={copyShareText}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'var(--xpx-surface-light)',
              border: '1px solid var(--xpx-border)',
              color: 'var(--xpx-text)',
            }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy instructions for WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstallAppPrompt({ hidden = false }: InstallAppPromptProps) {
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);
  const platform = getInstallPlatform();

  const refresh = useCallback(() => {
    setVisible(shouldShowInstallBanner() && !hidden);
    setNativeReady(canNativeInstall());
  }, [hidden]);

  useEffect(() => {
    if (isStandaloneApp() || hidden) return;

    attachInstallPromptListener(refresh);
    window.addEventListener('xpx-install-available', refresh);

    const timer = window.setTimeout(refresh, 2500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('xpx-install-available', refresh);
    };
  }, [hidden, refresh]);

  const handleInstall = async () => {
    if (nativeReady) {
      const result = await triggerNativeInstall();
      if (result === 'accepted') {
        setVisible(false);
        return;
      }
    }
    setShowHelp(true);
  };

  const handleDismiss = () => {
    dismissInstallBanner();
    setVisible(false);
  };

  if (!visible) {
    return (
      <InstallAppHelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        initialPlatform={platform}
      />
    );
  }

  const isMobile = platform === 'ios' || platform === 'android';

  return (
    <>
      <div
        className="fixed left-3 right-3 z-[45] animate-fade-in-up"
        style={{
          bottom: isMobile
            ? 'calc(72px + env(safe-area-inset-bottom))'
            : 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid var(--xpx-border-strong)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(80,200,120,0.15)', color: 'var(--xpx-warm-dark)' }}
          >
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-xpx-text leading-tight">Install XpressBnB</p>
            <p className="text-xs text-xpx-muted truncate">
              {nativeReady ? 'Tap Install — home screen app' : 'Add to home screen — no store needed'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--xpx-warm)' }}
          >
            {nativeReady ? 'Install' : 'How to'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-1.5 text-xpx-muted hover:text-xpx-text"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <InstallAppHelpModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        initialPlatform={platform}
      />
    </>
  );
}
