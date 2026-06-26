import type { InquiryTrustBadge } from '../../lib/inquiryTrust';

type InquiryTrustBadgeProps = {
  badge: InquiryTrustBadge;
  size?: 'sm' | 'md';
  className?: string;
};

export default function InquiryTrustBadgePill({
  badge,
  size = 'sm',
  className = '',
}: InquiryTrustBadgeProps) {
  const text = size === 'sm' ? badge.shortLabel : badge.label;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${className}`}
      style={{
        background: 'rgba(5,150,105,0.12)',
        color: '#047857',
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
      }}
      title={badge.description}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: '#059669' }}
        aria-hidden
      />
      {text}
    </span>
  );
}
