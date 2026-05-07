import { ReactNode } from 'react';
import { XPRESSBNB_LOGO_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../../lib/branding';
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
 * Shared light-mode shell for /auth/* — white field with soft accent glows.
 */
export default function AuthShell({ eyebrow, title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden xpx-page flex items-center justify-center px-4 py-12">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 45%, #F1F5F9 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 10%, rgba(80,200,120,0.12), transparent 55%)',
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
          className="flex items-center gap-2 mb-8 text-lg leading-none text-xpx-muted hover:text-xpx-text transition-colors"
        >
          <img
            src={XPRESSBNB_LOGO_PATH}
            alt=""
            className={XPRESSBNB_LOGO_IMG_CLASS}
            width={36}
            height={36}
            decoding="async"
          />
          <span className="font-extrabold tracking-tight text-xpx-text">
            Xpress<span style={{ color: theme.accent }}>BnB</span>
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
