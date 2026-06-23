import { getPropertyTrustDisplay, type PropertyTrustInput } from '../lib/propertyTrustDisplay';

interface PropertyTrustLineProps {
  property: PropertyTrustInput;
  variant?: 'compact' | 'page';
  className?: string;
}

/**
 * Compact one-line trust display for listing cards and property hero stats.
 */
export default function PropertyTrustLine({
  property,
  variant = 'compact',
  className = '',
}: PropertyTrustLineProps) {
  const trust = getPropertyTrustDisplay(property);

  if (trust.kind === 'verified_external_rating') {
    const sizeClass =
      variant === 'page' ? 'text-sm sm:text-[15px]' : 'text-[10px] sm:text-xs';
    return (
      <span
        className={`inline-flex items-center max-w-full font-semibold text-xpx-text tabular-nums truncate ${sizeClass} ${className}`}
      >
        {trust.label}
      </span>
    );
  }

  const chipClass =
    variant === 'page' ? 'text-xs sm:text-sm px-2.5 py-1' : 'text-[10px] px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-xpx-muted ${chipClass} ${className}`}
      style={{
        background: 'rgba(15,23,42,0.04)',
        border: '1px solid var(--xpx-border)',
      }}
    >
      {trust.label}
    </span>
  );
}
