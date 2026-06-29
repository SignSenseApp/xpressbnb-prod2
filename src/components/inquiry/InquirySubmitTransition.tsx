import { useEffect, useRef, useState } from 'react';
import {
  INQUIRY_TRANSITION_PHASES,
  type InquiryTransitionPhase,
} from '../../lib/inquirySuccessMotion';

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
    if (phase < 4) {
      completedRef.current = false;
      setVisible(true);
    }
  }, [phase]);

  useEffect(() => {
    if (phase < 4) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timer = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      setVisible(false);
      window.setTimeout(() => onCompleteRef.current(), reducedMotion ? 0 : 180);
    }, reducedMotion ? 60 : 200);

    return () => window.clearTimeout(timer);
  }, [phase]);

  const line = INQUIRY_TRANSITION_PHASES[displayPhase] ?? INQUIRY_TRANSITION_PHASES[0];

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
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="mx-auto mb-8 h-28 w-28 rounded-3xl overflow-hidden"
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
                  index <= displayPhase ? 'var(--xpx-verified, #059669)' : 'rgba(148,163,184,0.45)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
