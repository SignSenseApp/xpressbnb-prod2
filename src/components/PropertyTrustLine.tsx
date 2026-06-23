import { Sparkles, Info } from 'lucide-react';
import {
  getPropertyTrustChipLabel,
  getPropertyTrustDisplay,
  type PropertyTrustInput,
} from '../lib/propertyTrustDisplay';
import { openStayScoreIntro } from '../lib/stayScoreIntro';
import {
  computeXpressbnbStayScore,
  type ListingQualitySignals,
} from '../lib/xpressbnbStayScore';

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

function StayScoreBadge({
  label,
  variant,
  showInfo,
}: {
  label: string;
  variant: 'compact' | 'page';
  showInfo?: boolean;
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
      aria-label={label}
    >
      <Sparkles
        className={`${iconClass} shrink-0 ml-0.5`}
        style={{ color: 'var(--xpx-trust)' }}
        aria-hidden
      />
      <span className="truncate">{label}</span>
      {showInfo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openStayScoreIntro();
          }}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xpx-subtle hover:text-xpx-text hover:bg-slate-900/5"
          aria-label="What is XpressBNB Stay Score?"
        >
          <Info className="w-3 h-3" />
        </button>
      )}
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
          <StayScoreBadge
            label={stayScore.label}
            variant={variant}
            showInfo={variant === 'page'}
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
