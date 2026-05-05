import { ReactNode } from 'react';
import { theme } from '../../lib/theme';

interface AuthShellProps {
  /** Eyebrow above the title (e.g. "Welcome back"). */
  eyebrow?: string;
  /** Big page title. */
  title: string;
  /** Sub-headline under the title. */
  subtitle?: string;
  /** The auth form / card body. */
  children: ReactNode;
  /** Footer line beneath the card (links to switch screens, etc.). */
  footer?: ReactNode;
}

/**
 * Shared light-mode shell used by every /auth/* page so the brand presents
 * one face. Pastel peach → cream → lavender backdrop with a soft white
 * card that floats above on long-throw shadows.
 */
export default function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden xpx-page flex items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #FFEFE0 0%, #F5F2EC 45%, #EAE2F8 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 10%, rgba(244,162,97,0.32), transparent 55%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 15% 80%, rgba(167,139,250,0.28), transparent 55%)',
        }}
      />

      <div className="relative w-full max-w-md">
        <button
          onClick={() => {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="flex items-center gap-2 mb-8 text-xpx-muted hover:text-xpx-text transition-colors"
        >
          <img src="/image.png" alt="XpressBnB" className="h-9 w-9 object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-xpx-text">
            Xpress<span style={{ color: theme.warm }}>BnB</span>
          </span>
        </button>

        <div className="text-center mb-8">
          {eyebrow && <p className="xpx-eyebrow mb-3">{eyebrow}</p>}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-xpx-text">{title}</h1>
          {subtitle && (
            <p className="mt-3 text-xpx-muted text-base">{subtitle}</p>
          )}
        </div>

        <div
          className="rounded-3xl p-8"
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--xpx-border)',
            boxShadow: '0 24px 64px rgba(15,23,42,0.10)',
          }}
        >
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-xpx-muted">{footer}</div>}
      </div>
    </div>
  );
}
