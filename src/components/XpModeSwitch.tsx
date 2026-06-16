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
    <>
      <style>{`
        @keyframes xp-beta-shimmer {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          35% { opacity: 1; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        @keyframes xp-beta-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(251, 191, 36, 0); }
          50% { box-shadow: 0 0 14px rgba(251, 191, 36, 0.55), 0 0 28px rgba(5, 150, 105, 0.25); }
        }
        @keyframes xp-ai-rise {
          0% { transform: translateY(0) scale(1); }
          45% { transform: translateY(-1px) scale(1.03); }
          100% { transform: translateY(0) scale(1.02); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .xp-ai-link:hover .xp-beta-pill {
            animation: xp-beta-glow 1.1s ease-in-out infinite;
          }
          .xp-ai-link:hover .xp-beta-shine {
            animation: xp-beta-shimmer 0.85s ease-in-out infinite;
          }
          .xp-ai-link:hover .xp-ai-label {
            animation: xp-ai-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        }
      `}</style>

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
          aria-label="Open XpressBNB AI Concierge (beta)"
          className="xp-ai-link group relative inline-flex items-center gap-1 rounded-full px-2 py-1 sm:px-2 sm:py-1.5 pr-1.5 sm:pr-2 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-[color,background,transform,filter] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-safe:hover:scale-[1.04]"
          style={{
            color: isLight ? 'rgba(255,255,255,0.9)' : '#475569',
            letterSpacing: '-0.02em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = isLight ? '#fff7ed' : '#047857';
            e.currentTarget.style.background = isLight
              ? 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(251,191,36,0.14) 100%)'
              : 'linear-gradient(135deg, rgba(5,150,105,0.1) 0%, rgba(251,191,36,0.12) 100%)';
            e.currentTarget.style.filter = isLight
              ? 'drop-shadow(0 0 10px rgba(251,191,36,0.35))'
              : 'drop-shadow(0 0 8px rgba(5,150,105,0.25))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isLight ? 'rgba(255,255,255,0.9)' : '#475569';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.filter = 'none';
          }}
        >
          <span className="xp-ai-label inline-flex items-center">
            <span className="hidden sm:inline">XpressBNB.ai</span>
            <span className="sm:hidden">.ai</span>
          </span>

          <span
            className="xp-beta-pill relative overflow-hidden inline-flex items-center rounded-full px-1.5 py-px text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.14em] leading-none select-none"
            style={{
              color: '#78350f',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 45%, #fbbf24 100%)',
              border: '1px solid rgba(251, 191, 36, 0.65)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
            aria-hidden
          >
            <span
              className="xp-beta-shine pointer-events-none absolute inset-0 w-1/2"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
              }}
            />
            Beta
          </span>
        </a>
      </div>
    </>
  );
}
