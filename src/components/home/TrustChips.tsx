import { MessageCircle, Percent, ShieldCheck, Tag } from 'lucide-react';
import { TRUST_CHIPS } from '../../lib/premiumBrand';

const ICONS = {
  percent: Percent,
  chat: MessageCircle,
  shield: ShieldCheck,
  tag: Tag,
} as const;

type TrustChipsProps = {
  /** When true, only render the desktop chip row (avoids duplicate mobile markup on desktop). */
  desktopOnly?: boolean;
};

/** Trust strip — mobile: white 2×2 grid (design spec); desktop: floating chips */
export default function TrustChips({ desktopOnly = false }: TrustChipsProps) {
  return (
    <>
      {/* ── Mobile: white 2×2 grid strip ── */}
      {!desktopOnly && (
      <section className="xm-trust md:hidden" aria-label="Why book with XpressBnB">
        {TRUST_CHIPS.map((chip) => {
          const Icon = ICONS[chip.icon];
          const isAmber = chip.icon === 'shield';
          return (
            <div key={chip.id} className="xm-trust__item">
              <span
                className={`xm-trust__icon${isAmber ? ' xm-trust__icon--amber' : ''}`}
                aria-hidden
              >
                <Icon strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="xm-trust__title">{chip.title}</p>
                <p className="xm-trust__sub">{chip.sub}</p>
              </div>
            </div>
          );
        })}
      </section>
      )}

      {/* ── Desktop: unchanged floating chips ── */}
      <section
        className="xpx-premium-trust hidden md:block"
        aria-label="Why book with XpressBnB"
      >
        <div className="xpx-container">
          <div className="xpx-premium-trust-track scrollbar-hide" role="list">
            {TRUST_CHIPS.map((chip, i) => {
              const Icon = ICONS[chip.icon];
              const isGold = chip.icon === 'shield';
              return (
                <div
                  key={chip.id}
                  role="listitem"
                  className={`xpx-premium-trust-chip xpx-premium-trust-chip--${i + 1}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span
                    className="xpx-premium-trust-chip__icon"
                    style={{
                      background: isGold ? 'rgba(212, 175, 55, 0.16)' : 'rgba(11, 138, 90, 0.12)',
                      color: isGold ? '#B8962E' : '#0B8A5A',
                    }}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="xpx-premium-trust-chip__title">{chip.title}</p>
                    <p className="xpx-premium-trust-chip__sub">{chip.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
