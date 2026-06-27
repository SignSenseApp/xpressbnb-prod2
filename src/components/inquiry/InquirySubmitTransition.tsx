import { useEffect, useRef, useState } from 'react';
import {
  INQUIRY_TRANSITION_LINES,
  INQUIRY_TRANSITION_MIN_TOTAL_MS,
  INQUIRY_TRANSITION_STEP_MS,
  type InquiryTransitionStep,
} from '../../lib/inquirySuccessMotion';

type InquirySubmitTransitionProps = {
  /** 0 = submitting, 1 = connecting host, 2 = almost ready */
  step: InquiryTransitionStep;
  onComplete: () => void;
};

export default function InquirySubmitTransition({ step, onComplete }: InquirySubmitTransitionProps) {
  const [displayStep, setDisplayStep] = useState(step);
  const [visible, setVisible] = useState(true);
  const startedAt = useRef(Date.now());
  const completedRef = useRef(false);

  useEffect(() => {
    setDisplayStep(step);
  }, [step]);

  useEffect(() => {
    if (step < 2) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const elapsed = Date.now() - startedAt.current;
    const remaining = reducedMotion
      ? 120
      : Math.max(0, INQUIRY_TRANSITION_MIN_TOTAL_MS - elapsed);

    const timer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      setVisible(false);
      window.setTimeout(onComplete, reducedMotion ? 0 : 180);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [step, onComplete]);

  const line = INQUIRY_TRANSITION_LINES[displayStep] ?? INQUIRY_TRANSITION_LINES[0];

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{
        background: 'rgba(248, 250, 252, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="status"
      aria-live="polite"
      aria-busy={visible}
    >
      <div
        className="w-full max-w-sm text-center inquiry-transition-enter motion-reduce:animate-none"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div
          className="mx-auto mb-8 h-28 w-28 rounded-3xl overflow-hidden shadow-lg"
          style={{
            border: '1px solid rgba(5,150,105,0.18)',
            boxShadow: '0 20px 48px rgba(5,150,105,0.12)',
          }}
        >
          <img
            src="/images/inquiry/host-introduction.svg"
            alt=""
            width={112}
            height={112}
            className="h-full w-full object-cover"
            decoding="async"
          />
        </div>

        <p
          key={displayStep}
          className="text-lg sm:text-xl font-semibold text-xpx-text tracking-tight inquiry-line-crossfade motion-reduce:animate-none"
        >
          {line}
        </p>

        <div className="mt-8 flex justify-center gap-2" aria-hidden>
          {INQUIRY_TRANSITION_LINES.map((_, index) => (
            <span
              key={index}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: index === displayStep ? '1.75rem' : '0.375rem',
                background:
                  index <= displayStep ? 'var(--xpx-verified, #059669)' : 'rgba(148,163,184,0.45)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Advance transition steps after API success — respects reduced motion. */
export function scheduleInquiryTransitionSteps(
  onStep: (step: InquiryTransitionStep) => void,
): () => void {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const delay = reducedMotion ? 80 : INQUIRY_TRANSITION_STEP_MS;
  const timers: number[] = [];

  onStep(1);
  timers.push(window.setTimeout(() => onStep(2), delay));

  return () => timers.forEach((t) => window.clearTimeout(t));
}
