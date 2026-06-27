import { Check } from 'lucide-react';

const POINTS = [
  'No payment required now',
  'No account required',
  'Your Guest ID is created after this inquiry',
  'Track everything anytime',
] as const;

/** Pre-submit reassurance — reduces inquiry anxiety without fake urgency. */
export default function InquiryConfidenceStrip({ className = '' }: { className?: string }) {
  return (
    <ul
      className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl p-4 text-left ${className}`}
      style={{
        background: 'var(--xpx-accent-light, #ecfdf5)',
        border: '1px solid var(--xpx-accent-border, #a7f3d0)',
      }}
      aria-label="What happens when you inquire"
    >
      {POINTS.map((point) => (
        <li key={point} className="flex items-start gap-2 text-[13px] text-xpx-text leading-snug">
          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-700" strokeWidth={2.5} aria-hidden />
          {point}
        </li>
      ))}
    </ul>
  );
}
