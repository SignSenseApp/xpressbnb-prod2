/** External XpressBNB.ai concierge beta — no query params or user data. */
export const XPRESSBNB_AI_URL = 'https://xpressbnbai.vercel.app' as const;

type XpModeSwitchProps = {
  /** `light` = white text on transparent hero headers; `dark` = ink on white bar. */
  variant?: 'light' | 'dark';
  className?: string;
};

/**
 * Marketplace ↔ AI concierge mode switch. `.com` is active on this site;
 * `.ai` opens the standalone beta in a new tab.
 */
export default function XpModeSwitch({ variant = 'dark', className = '' }: XpModeSwitchProps) {
  const isLight = variant === 'light';

  return (
    <div
      role="group"
      aria-label="XpressBNB site mode"
      className={`inline-flex items-center rounded-full p-0.5 shrink-0 ${className}`}
      style={{
        background: isLight ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        border: isLight ? '1px solid rgba(255,255,255,0.28)' : '1px solid rgba(255,255,255,0.65)',
        boxShadow: isLight ? 'none' : '0 1px 2px rgba(15,23,42,0.06)',
      }}
    >
      <span
        aria-current="page"
        className="rounded-full px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap select-none"
        style={{
          background: '#059669',
          color: '#ffffff',
          letterSpacing: '-0.02em',
        }}
      >
        <span className="hidden sm:inline">XpressBNB.com</span>
        <span className="sm:hidden">.com</span>
      </span>
      <a
        href={XPRESSBNB_AI_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open XpressBNB AI Concierge"
        className="rounded-full px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        style={{
          color: isLight ? 'rgba(255,255,255,0.88)' : '#64748B',
          letterSpacing: '-0.02em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = isLight ? '#ffffff' : '#059669';
          e.currentTarget.style.background = isLight ? 'rgba(255,255,255,0.12)' : 'rgba(5,150,105,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = isLight ? 'rgba(255,255,255,0.88)' : '#64748B';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span className="hidden sm:inline">XpressBNB.ai</span>
        <span className="sm:hidden">.ai</span>
      </a>
    </div>
  );
}
