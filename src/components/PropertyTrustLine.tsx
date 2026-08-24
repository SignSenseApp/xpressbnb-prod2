import { Sparkles, Info } from 'lucide-react';
import {
  getPropertyTrustChipLabel,
  getPropertyTrustDisplay,
  type PropertyTrustInput,
} from '../lib/propertyTrustDisplay';
import { TRUST_BADGE_COPY } from '../lib/trustBadgeCopy';
import { openStayScoreInfo } from '../lib/stayScoreEducation';
import {
  computeXpressbnbStayScore,
  type ListingQualitySignals,
} from '../lib/xpressbnbStayScore';

export type PropertyTrustLineInput = PropertyTrustInput & ListingQualitySignals;

interface PropertyTrustLineProps {
  property: PropertyTrustLineInput;
  variant?: 'compact' | 'page';
  /** Hide inline score when duplicated elsewhere on the card. */
  omitStayScore?: boolean;
  className?: string;
}

function TrustChip({ label, title }: { label: string; title?: string }) {
  return (
    <span className="xpx-trust-micro shrink-0 max-w-full truncate" title={title}>
      {label}
    </span>
  );
}

function StayScoreBadge({
  label,
  variant,
  onOpenInfo,
}: {
  label: string;
  variant: 'compact' | 'page';
  onOpenInfo: (e: React.MouseEvent) => void;
}) {
  const sizeClass =
    variant === 'page' ? 'text-xs sm:text-sm px-2.5 py-1' : 'text-[10px] px-2 py-0.5';
  const iconClass = variant === 'page' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-semibold text-xpx-text tabular-nums shrink-0 max-w-full ${sizeClass}`}
      style={{
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
      }}
    >
      <button
        type="button"
        onClick={onOpenInfo}
        className="inline-flex items-center gap-0.5 min-w-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        aria-label={label}
      >
        <Sparkles
          className={`${iconClass} shrink-0 ml-0.5`}
          style={{ color: 'var(--xpx-trust)' }}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </button>
      <button
        type="button"
        onClick={onOpenInfo}
        className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xpx-subtle hover:text-xpx-text hover:bg-slate-900/5 shrink-0"
        aria-label="What is XpressBNB Stay Score?"
      >
        <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </button>
    </span>
  );
}

/**
 * Trust row: verified external rating (if any), XpressBNB Stay Score, and fallback chip.
 */
export default function PropertyTrustLine({
  property,
  variant = 'compact',
  omitStayScore = false,
  className = '',
}: PropertyTrustLineProps) {
  const trust = getPropertyTrustDisplay(property);
  const stayScore = computeXpressbnbStayScore(property);
  const chipLabel = getPropertyTrustChipLabel(property);
  const chipTitle =
    chipLabel === 'Premium listing'
      ? TRUST_BADGE_COPY.premiumListing.title
      : chipLabel === 'Direct host booking'
        ? TRUST_BADGE_COPY.directHostListing.title
        : undefined;

  const externalClass =
    variant === 'page' ? 'text-sm sm:text-[15px]' : 'text-[10px] sm:text-xs';

  const openInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    openStayScoreInfo();
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 min-w-0 ${className}`}>
      {trust.kind === 'verified_external_rating' && (
        <span
          className={`inline-flex items-center max-w-full font-semibold text-xpx-text tabular-nums truncate shrink-0 ${externalClass}`}
          title={TRUST_BADGE_COPY.externalRating.title}
        >
          {trust.label}
        </span>
      )}
      {!omitStayScore && (
        <StayScoreBadge
          label={stayScore.label}
          variant={variant}
          onOpenInfo={openInfo}
        />
      )}
      <TrustChip label={chipLabel} title={chipTitle} />
      {variant === 'page' && (
        <button
          type="button"
          onClick={openInfo}
          className="text-[11px] sm:text-xs font-semibold text-xpx-muted underline underline-offset-2 hover:text-xpx-text"
          title={stayScore.microcopy}
        >
          How it works
        </button>
      )}
    </div>
  );
}
