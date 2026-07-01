import {
  INQUIRY_PHASE_MIN_DWELL_MS,
  type InquiryTransitionPhase,
} from './inquirySuccessMotion';

function minDwell(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

async function runWithMinDwell(task: () => void | Promise<void>): Promise<void> {
  const dwell = prefersReducedMotion() ? 60 : INQUIRY_PHASE_MIN_DWELL_MS;
  await Promise.all([Promise.resolve(task()), minDwell(dwell)]);
}

/**
 * Advance transition phases from real post-submit work — not arbitrary timers.
 * Caller runs after submit-booking-inquiry succeeds.
 */
export async function runPostSubmitTransitionPhases(input: {
  onPhase: (phase: InquiryTransitionPhase) => void;
  resolveHost?: () => Promise<void>;
}): Promise<void> {
  input.onPhase(1);
  await runWithMinDwell(async () => {
    if (input.resolveHost) await input.resolveHost();
  });
}
