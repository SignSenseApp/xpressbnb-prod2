import { BOOKING_STEP_LABELS } from './bookingStepLabels';

type BookingProgressBarProps = {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
};

const DEFAULT_LABELS = [...BOOKING_STEP_LABELS];

/**
 * Sticky booking progress — "Step 2 of 4" with visual bar.
 */
export default function BookingProgressBar({
  currentStep,
  totalSteps = 4,
  labels = DEFAULT_LABELS,
}: BookingProgressBarProps) {
  const clamped = Math.min(Math.max(1, currentStep), totalSteps);
  const pct = (clamped / totalSteps) * 100;

  return (
    <div
      className="sticky top-0 z-20 -mx-1 px-1 py-3 mb-2"
      style={{ background: 'linear-gradient(180deg, var(--xpx-surface) 85%, transparent)' }}
      role="status"
      aria-live="polite"
      aria-label={`Step ${clamped} of ${totalSteps}: ${labels[clamped - 1] ?? ''}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-xpx-muted mb-2">
        <span>
          Step {clamped} of {totalSteps}
        </span>
        <span className="text-xpx-text">{labels[clamped - 1]}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%`, background: '#059669' }}
        />
      </div>
    </div>
  );
}
