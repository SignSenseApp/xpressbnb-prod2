import {
  BadgeCheck,
  Calendar,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { theme } from '../../lib/theme';

export interface HostValuePropProps {
  /** `full` — subscription/overview; `compact` — dashboards; `minimal` — signup / empty states */
  variant?: 'full' | 'compact' | 'minimal';
  showComparison?: boolean;
  showBenefits?: boolean;
  showSocialProof?: boolean;
  showUpgradeNudge?: boolean;
  /** When false, skips the eyebrow + headline block (page already has its own title). */
  showHeader?: boolean;
  onUpgradeClick?: () => void;
  className?: string;
}

const SOCIAL_PROOF = [
  { label: 'Homestays in Uttarakhand', detail: 'Host since 2024' },
  { label: 'Villa · Goa', detail: '12 direct bookings' },
  { label: 'Boutique stay · Jaipur', detail: 'Verified host' },
] as const;

export default function HostValueProp({
  variant = 'full',
  showComparison = variant === 'full',
  showBenefits = true,
  showSocialProof = variant !== 'minimal',
  showUpgradeNudge = true,
  showHeader = true,
  onUpgradeClick,
  className = '',
}: HostValuePropProps) {
  const isFull = variant === 'full';
  const isMinimal = variant === 'minimal';
  const pad = isFull ? 'p-6 sm:p-8' : isMinimal ? 'p-4 sm:p-5' : 'p-5 sm:p-6';

  return (
    <section
      className={`rounded-2xl ${pad} ${className}`}
      style={
        isFull
          ? {
              background:
                'linear-gradient(135deg, rgba(80,200,120,0.12) 0%, var(--xpx-surface) 65%)',
              border: '1px solid rgba(80,200,120,0.35)',
              boxShadow: '0 12px 40px rgba(15,23,42,0.06)',
            }
          : {
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border)',
            }
      }
      aria-label="Why hosts choose XpressBnB"
    >
      {showHeader && (
        <header className={isMinimal ? 'mb-4' : 'mb-5 sm:mb-6'}>
          <p className="xpx-eyebrow">For Indian hosts</p>
          <h2
            className={
              isFull
                ? 'text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight mt-1'
                : 'text-lg sm:text-xl font-extrabold text-xpx-text tracking-tight mt-1'
            }
          >
            0% commission — guests pay you directly
          </h2>
          <p className="text-sm text-xpx-muted mt-2 max-w-2xl leading-relaxed">
            {isMinimal
              ? 'List free. Collect rent on UPI, bank transfer, or cash. We never take a cut of your payout.'
              : 'No host service fee on bookings. You set the price, accept or reject each inquiry, and settle payment your way — UPI, bank transfer, or cash.'}
          </p>
        </header>
      )}

      {showComparison && <FeeComparisonTable compact={!isFull} />}

      {showBenefits && (
        <ul
          className={
            isFull
              ? 'mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3'
              : 'mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5'
          }
        >
          <BenefitItem
            icon={MessageCircle}
            title="Direct WhatsApp with guest"
            body="Verified phone after you accept — coordinate check-in without a middleman."
            compact={!isFull}
          />
          <BenefitItem
            icon={ShieldCheck}
            title="You control accept / reject"
            body="Every inquiry waits on you. Counter offers on price, or decline politely."
            compact={!isFull}
          />
          <BenefitItem
            icon={BadgeCheck}
            title="First listing free"
            body="Upgrade when you want calendar sync, analytics, and a verified badge on the listing."
            compact={!isFull}
          />
        </ul>
      )}

      {showSocialProof && (
        <div className={isFull ? 'mt-6 pt-6' : 'mt-4 pt-4'} style={{ borderTop: '1px solid var(--xpx-border)' }}>
          <p className="text-[11px] uppercase tracking-wider font-bold text-xpx-subtle mb-3">
            Hosts like you (sample)
          </p>
          <div
            className={
              isFull
                ? 'grid grid-cols-1 sm:grid-cols-3 gap-3'
                : 'flex flex-col sm:flex-row gap-2 sm:gap-3'
            }
          >
            {SOCIAL_PROOF.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2.5 rounded-xl p-3 flex-1 min-w-0"
                style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.25)' }}
                >
                  <Users className="w-4 h-4" style={{ color: theme.warm }} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-xpx-text truncate">{item.label}</p>
                  <p className="text-xs text-xpx-muted flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 flex-shrink-0" style={{ color: theme.warm }} aria-hidden />
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUpgradeNudge && (
        <div
          className={
            isFull
              ? 'mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl p-4'
              : 'mt-4 rounded-xl p-3.5 sm:p-4'
          }
          style={{
            background: 'var(--xpx-surface-light)',
            border: '1px solid var(--xpx-border)',
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: theme.warm }} aria-hidden />
            <div>
              <p className="text-sm font-semibold text-xpx-text">
                First listing is free — upgrade when you&apos;re ready
              </p>
              <p className="text-xs text-xpx-muted mt-1 leading-relaxed">
                Standard (₹999) or Premium (₹2,999) per property/month adds calendar sync, insights, and
                verified badge. Guests still never pay us for the stay.
              </p>
            </div>
          </div>
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'var(--xpx-warm)',
                color: '#ffffff',
                boxShadow: '0 4px 18px rgba(80,200,120,0.35)',
              }}
            >
              View plans
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function BenefitItem({
  icon: Icon,
  title,
  body,
  compact,
}: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
  compact: boolean;
}) {
  return (
    <li
      className="rounded-xl p-3 sm:p-4"
      style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: theme.warm }} aria-hidden />
        <div>
          <p className={`font-semibold text-xpx-text ${compact ? 'text-sm' : ''}`}>{title}</p>
          <p className={`text-xpx-muted mt-1 leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>{body}</p>
        </div>
      </div>
    </li>
  );
}

function FeeComparisonTable({ compact }: { compact: boolean }) {
  const rows = [
    {
      label: 'Host fee on a ₹10,000 booking',
      airbnb: '~₹1,500 (≈15%)',
      xpress: '₹0',
      highlight: true,
    },
    {
      label: 'Platform cost to you',
      airbnb: 'Commission on every payout',
      xpress: 'Flat ₹999 or ₹2,999 / property / month (optional)',
      highlight: false,
    },
    {
      label: 'Guest pays stay amount to',
      airbnb: 'Platform (then payout to you)',
      xpress: 'You — directly',
      highlight: false,
    },
  ] as const;

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ border: '1px solid var(--xpx-border)', background: 'var(--xpx-surface)' }}
    >
      <div className="overflow-x-auto">
        <table className={`w-full text-left ${compact ? 'text-xs' : 'text-sm'}`}>
          <thead>
            <tr style={{ background: 'var(--xpx-surface-light)' }}>
              <th
                scope="col"
                className="px-3 py-2.5 font-bold text-xpx-subtle uppercase tracking-wider text-[10px]"
              >
                &nbsp;
              </th>
              <th scope="col" className="px-3 py-2.5 font-bold text-xpx-muted">
                Typical OTA (e.g. Airbnb)
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 font-bold"
                style={{ color: theme.warm, background: 'rgba(80,200,120,0.08)' }}
              >
                XpressBnB
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                style={
                  row.highlight
                    ? { background: 'rgba(80,200,120,0.06)' }
                    : { borderTop: '1px solid var(--xpx-border)' }
                }
              >
                <th
                  scope="row"
                  className="px-3 py-3 font-medium text-xpx-text align-top max-w-[8rem] sm:max-w-none"
                >
                  {row.label}
                </th>
                <td className="px-3 py-3 text-xpx-muted align-top">{row.airbnb}</td>
                <td
                  className="px-3 py-3 font-semibold text-xpx-text align-top"
                  style={{ background: row.highlight ? 'rgba(80,200,120,0.04)' : undefined }}
                >
                  {row.xpress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-3 py-2 text-[11px] text-xpx-subtle" style={{ borderTop: '1px solid var(--xpx-border)' }}>
        Airbnb host fee varies by region and plan; ~15% is a common India benchmark. XpressBnB subscription is
        per property, not per booking.
      </p>
    </div>
  );
}
