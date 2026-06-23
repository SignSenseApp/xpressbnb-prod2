import {
  getPropertyTrustChipLabel,
  getPropertyTrustDisplay,
  type PropertyTrustInput,
} from '../lib/propertyTrustDisplay';
import {
  computeXpressbnbStayScore,
  type ListingQualitySignals,
} from '../lib/xpressbnbStayScore';
import StayScoreCardChip from './stayScore/StayScoreCardChip';

export type PropertyTrustLineInput = PropertyTrustInput & ListingQualitySignals;

interface PropertyTrustLineProps {
  property: PropertyTrustLineInput;
  variant?: 'compact' | 'page';
  /** Hide inline score when the image badge already shows it. */
  omitStayScore?: boolean;
  className?: string;
}

function TrustChip({
  label,
  variant,
}: {
  label: string;
  variant: 'compact' | 'page';
}) {
  const chipClass =
    variant === 'page' ? 'text-xs sm:text-sm px-2.5 py-1' : 'text-[10px] px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-xpx-muted shrink-0 ${chipClass}`}
      style={{
        background: 'rgba(15,23,42,0.04)',
        border: '1px solid var(--xpx-border)',
      }}
    >
      {label}
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

  const externalClass =
    variant === 'page' ? 'text-sm sm:text-[15px]' : 'text-[10px] sm:text-xs';

  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {trust.kind === 'verified_external_rating' && (
          <span
            className={`inline-flex items-center max-w-full font-semibold text-xpx-text tabular-nums truncate shrink-0 ${externalClass}`}
          >
            {trust.label}
          </span>
        )}
        {!omitStayScore && (
          <StayScoreCardChip
            score={stayScore.score}
            layout={variant === 'page' ? 'inline' : 'card'}
            showInfo={variant === 'page'}
            ariaLabel={stayScore.label}
          />
        )}
        <TrustChip label={chipLabel} variant={variant} />
      </div>
      {variant === 'page' && (
        <p className="text-[11px] sm:text-xs text-xpx-subtle leading-snug max-w-xl">
          {stayScore.microcopy}
        </p>
      )}
    </div>
  );
}
