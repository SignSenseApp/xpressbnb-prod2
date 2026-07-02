import { Check } from 'lucide-react';

const POINTS = [
  'No payment until the host confirms',
  'No account required',
  'Ops reviews before the host sees your details',
  'Track anytime with your Guest ID',
] as const;

/** Pre-submit reassurance — reduces inquiry anxiety without fake urgency. */
export default function InquiryConfidenceStrip({ className = '' }: { className?: string }) {
  return (
    <ul
      className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl p-4 text-left ${className}`}
      style={{
        background: 'rgba(15, 23, 42, 0.03)',
        border: '1px solid var(--xpx-border)',
      }}
      aria-label="What happens when you inquire"
    >
      {POINTS.map((point) => (
        <li key={point} className="flex items-start gap-2 text-sm text-xpx-text leading-snug">
          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-xpx-muted" strokeWidth={2.25} aria-hidden />
          {point}
        </li>
      ))}
    </ul>
  );
}
