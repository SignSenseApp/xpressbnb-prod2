import { BOOKING_STEP_LABELS } from './bookingStepLabels';

type BookingProgressBarProps = {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
};

const DEFAULT_LABELS = [...BOOKING_STEP_LABELS];

const REASSURANCE: Record<number, string> = {
  3: 'A few details for our team',
  4: 'Ready when you are',
};

/** Whisper progress — hidden until guest details; never leads the page. */
export default function BookingProgressBar({
  currentStep,
  totalSteps = 4,
  labels = DEFAULT_LABELS,
}: BookingProgressBarProps) {
  const clamped = Math.min(Math.max(1, currentStep), totalSteps);

  if (clamped < 3) {
    return null;
  }

  const pct = (clamped / totalSteps) * 100;
  const whisper = REASSURANCE[clamped] ?? labels[clamped - 1];

  return (
    <div
      className="xpx-concierge-progress xpx-concierge-progress--whisper"
      role="status"
      aria-live="polite"
      aria-label={whisper}
    >
      <p className="xpx-concierge-progress-reassurance">{whisper}</p>
      <div className="xpx-concierge-progress-track" aria-hidden>
        <div className="xpx-concierge-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
