/** External XpressBNB AI concierge — opens xpressbnbai.in (no query params or user data). */
export const XPRESSBNB_AI_URL = 'https://xpressbnbai.in' as const;

type XpModeSwitchProps = {
  /** `light` = white text on transparent hero headers; `dark` = ink on white bar. */
  variant?: 'light' | 'dark';
  className?: string;
};

/**
 * Compact marketplace ↔ AI mode switch (.com active here · .in opens AI concierge).
 */
export default function XpModeSwitch({ variant = 'dark', className = '' }: XpModeSwitchProps) {
  const isLight = variant === 'light';

  const trackBg = isLight ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.04)';
  const trackBorder = isLight ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.08)';
  const dividerColor = isLight ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.12)';

  return (
    <>
      <style>{`
        @keyframes xp-switch-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes xp-beta-pop {
          0%, 100% { transform: scale(1) rotate(0deg); }
          40% { transform: scale(1.14) rotate(-4deg); }
          70% { transform: scale(1.08) rotate(2deg); }
        }
        @keyframes xp-ai-pulse-ring {
          0% { transform: scale(0.92); opacity: 0.7; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes xp-dot-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.85); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .xp-mode-ai:hover {
            transform: scale(1.06);
          }
          .xp-mode-ai:hover .xp-ai-text {
            background-size: 200% auto;
            animation: xp-switch-shimmer 1.4s linear infinite;
          }
          .xp-mode-ai:hover .xp-beta-tag {
            animation: xp-beta-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
          }
          .xp-mode-ai:hover .xp-ai-ring {
            animation: xp-ai-pulse-ring 1.2s ease-out infinite;
          }
        }
      `}</style>

      <div
        role="group"
        aria-label="XpressBNB site mode: marketplace or AI concierge"
        className={`inline-flex items-stretch rounded-full p-0.5 shrink-0 ${className}`}
        style={{
          background: trackBg,
          backdropFilter: 'blur(14px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.5)',
          border: `1px solid ${trackBorder}`,
          boxShadow: isLight
            ? 'inset 0 1px 0 rgba(255,255,255,0.2)'
            : '0 1px 3px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
        }}
      >
        {/* Active marketplace */}
        <span
          aria-current="page"
          className="relative inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold tracking-tight select-none"
          style={{
            background: 'linear-gradient(145deg, #10b981 0%, #059669 55%, #047857 100%)',
            color: '#ffffff',
            boxShadow: '0 2px 10px rgba(5,150,105,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-[xp-dot-breathe_2s_ease-in-out_infinite]"
            style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }}
            aria-hidden
          />
          .com
        </span>

        {/* Divider */}
        <span
          className="w-px self-stretch my-1.5 mx-0.5 rounded-full"
          style={{ background: dividerColor }}
          aria-hidden
        />

        {/* AI beta — external */}
        <a
          href={XPRESSBNB_AI_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open XpressBNB AI Concierge on xpressbnbai.in"
          className="xp-mode-ai group relative inline-flex items-center gap-1 rounded-full px-2 py-1.5 sm:px-2.5 sm:py-1.5 transition-[transform,background,box-shadow] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          style={{
            color: isLight ? 'rgba(255,255,255,0.75)' : '#64748b',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isLight
              ? 'linear-gradient(135deg, rgba(167,139,250,0.25) 0%, rgba(52,211,153,0.2) 50%, rgba(251,191,36,0.2) 100%)'
              : 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(52,211,153,0.14) 50%, rgba(251,191,36,0.14) 100%)';
            e.currentTarget.style.boxShadow = isLight
              ? '0 0 20px rgba(167,139,250,0.35), 0 0 32px rgba(52,211,153,0.2)'
              : '0 0 16px rgba(5,150,105,0.2), 0 0 24px rgba(167,139,250,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span
            className="xp-ai-ring pointer-events-none absolute inset-0 rounded-full border border-emerald-400/0 group-hover:border-emerald-400/40"
            aria-hidden
          />

          <span
            className={`xp-ai-text relative z-[1] text-[11px] sm:text-xs font-extrabold tracking-tight transition-all duration-300 ${
              isLight ? 'text-white/80 group-hover:text-white' : ''
            }`}
            style={
              isLight
                ? undefined
                : {
                    backgroundImage:
                      'linear-gradient(90deg, #059669, #8b5cf6, #06b6d4, #059669)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    backgroundSize: '100% auto',
                  }
            }
          >
            .in
          </span>

          <span
            className="xp-beta-tag relative z-[1] overflow-hidden rounded-full px-1.5 py-px text-[7px] sm:text-[8px] font-black uppercase tracking-[0.16em] leading-none"
            style={{
              color: '#5b21b6',
              background: 'linear-gradient(135deg, #f5d0fe 0%, #c4b5fd 40%, #a78bfa 100%)',
              border: '1px solid rgba(139, 92, 246, 0.45)',
              boxShadow: '0 0 10px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
            aria-hidden
          >
            beta
          </span>
        </a>
      </div>
    </>
  );
}
