import { useEffect, useRef, useState } from 'react';
import {
  INQUIRY_MOTION_EASE,
  INQUIRY_MOTION_MS,
  INQUIRY_TRANSITION_PHASES,
  type InquiryTransitionPhase,
} from '../../lib/inquirySuccessMotion';

const TERMINAL_PHASE = (INQUIRY_TRANSITION_PHASES.length - 1) as InquiryTransitionPhase;

type InquirySubmitTransitionProps = {
  phase: InquiryTransitionPhase;
  onComplete: () => void;
};

export default function InquirySubmitTransition({ phase, onComplete }: InquirySubmitTransitionProps) {
  const [displayPhase, setDisplayPhase] = useState(phase);
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayPhase(phase);
    if (phase < TERMINAL_PHASE) {
      completedRef.current = false;
      setVisible(true);
    }
  }, [phase]);

  useEffect(() => {
    if (phase < TERMINAL_PHASE) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const exitMs = reducedMotion ? 60 : INQUIRY_MOTION_MS;
    const fadeMs = reducedMotion ? 0 : INQUIRY_MOTION_MS - 20;

    const timer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      setVisible(false);
      window.setTimeout(() => onCompleteRef.current(), fadeMs);
    }, exitMs);

    return () => window.clearTimeout(timer);
  }, [phase]);

  const line = INQUIRY_TRANSITION_PHASES[displayPhase] ?? INQUIRY_TRANSITION_PHASES[0];

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center px-6 overflow-hidden xpx-glass"
      style={{
        background: 'var(--xpx-page)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="status"
      aria-live="polite"
      aria-busy={visible}
      aria-label={line}
    >
      <div
        className="w-full max-w-sm text-center inquiry-transition-enter motion-reduce:animate-none"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.98)',
          transition: `opacity ${INQUIRY_MOTION_MS - 20}ms ${INQUIRY_MOTION_EASE}, transform ${INQUIRY_MOTION_MS - 20}ms ${INQUIRY_MOTION_EASE}`,
        }}
      >
        <div
          className="mx-auto mb-8 h-28 w-28 rounded-3xl overflow-hidden"
          style={{
            border: '1px solid var(--xpx-accent-a18)',
            boxShadow: 'var(--xpx-shadow-floating)',
          }}
        >
          <img
            src="/images/inquiry/host-introduction.svg"
            alt="Host introduction illustration"
            width={112}
            height={112}
            className="h-full w-full object-cover"
            decoding="async"
          />
        </div>

        <p
          key={displayPhase}
          className="text-lg sm:text-xl font-semibold text-xpx-text tracking-tight inquiry-line-crossfade motion-reduce:animate-none"
        >
          {line}
        </p>

        <div className="mt-8 flex justify-center gap-2" aria-hidden>
          {INQUIRY_TRANSITION_PHASES.map((_, index) => (
            <span
              key={index}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: index === displayPhase ? '1.75rem' : '0.375rem',
                background:
                  index <= displayPhase ? 'var(--xpx-cta)' : 'var(--xpx-subtle)',
                opacity: index <= displayPhase ? 1 : 0.45,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
