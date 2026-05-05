import { useEffect, useState } from 'react';
import { theme } from '../lib/theme';

interface PreloaderProps {
  isLoading: boolean;
}

/**
 * Preloader — light cinematic "open the curtain" intro.
 *
 * Visual story:
 *  - A warm off-white stage with a soft warm spotlight from above.
 *  - The wordmark Xpress / BnB falls into place via a left/right reveal,
 *    crossing at the center, then unifies with a thin warm underline that
 *    grows as a deterministic progress indicator.
 *  - Two horizontal "curtain" panels swipe outward on exit so the next
 *    page is revealed cinematically. Curtains are soft cream rather than
 *    pitch black so the exit reads as "morning curtains" not "blackout".
 *
 * Implementation notes:
 *  - Uses CSS keyframes injected on first mount; we keep them isolated to
 *    this component so the global stylesheet stays clean.
 *  - `shouldRender` keeps the DOM mounted through the exit animation so
 *    the curtain swipe finishes cleanly before unmount.
 */
export default function Preloader({ isLoading }: PreloaderProps) {
  const [shouldRender, setShouldRender] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 700);
      return () => clearTimeout(timer);
    }
    setShouldRender(true);
    setIsVisible(true);
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden={!isVisible}
      role="status"
    >
      {/* Top curtain — slides up on exit (warm off-white) */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 transition-transform duration-[700ms] ease-[cubic-bezier(0.83,0,0.17,1)]"
        style={{
          background: theme.base,
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        }}
      />
      {/* Bottom curtain — slides down on exit */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 transition-transform duration-[700ms] ease-[cubic-bezier(0.83,0,0.17,1)]"
        style={{
          background: theme.base,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        }}
      />

      {/* Spotlight + content layer (fades during exit so curtains lead) */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        {/* Warm cinematic spotlight from top-right — softer on light bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 80% 0%, rgba(244,162,97,0.35), transparent 65%)`,
            opacity: 0.7,
          }}
        />
        {/* Soft floor glow under the wordmark — peach blush */}
        <div
          className="absolute left-1/2 -translate-x-1/2 bottom-[35%] w-[480px] h-[180px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(244,162,97,0.32), transparent 70%)`,
            filter: 'blur(40px)',
            opacity: 0.65,
          }}
        />
        {/* Lavender accent glow on the left so the spotlight isn't single-tone */}
        <div
          className="absolute left-[8%] top-[18%] w-[320px] h-[320px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, rgba(167,139,250,0.18), transparent 70%)`,
            filter: 'blur(48px)',
          }}
        />

        <div className="relative flex flex-col items-center">
          {/* Wordmark — split halves crash into the middle */}
          <div className="flex items-baseline overflow-hidden">
            <span
              className="block text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight xpx-pre-left"
              style={{ color: theme.text }}
            >
              Xpress
            </span>
            <span
              className="block text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight xpx-pre-right"
              style={{ color: theme.warm }}
            >
              BnB
            </span>
          </div>

          {/* Progress underline — grows from left to right */}
          <div
            className="relative mt-5 h-[2px] w-[180px] rounded-full overflow-hidden"
            style={{ background: 'rgba(15,23,42,0.08)' }}
          >
            <div
              className="absolute inset-y-0 left-0 xpx-pre-bar"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.warm}, transparent)`,
              }}
            />
          </div>

          {/* Tagline — fades in slightly delayed */}
          <p
            className="mt-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.36em] xpx-pre-tag"
            style={{ color: theme.textMuted }}
          >
            India&apos;s Smarter Stay
          </p>
        </div>
      </div>

      {/* Scoped keyframes — kept inline so this file is fully self-contained. */}
      <style>{`
        @keyframes xpx-pre-slide-in-left {
          0% { transform: translateX(-120%); opacity: 0; }
          60% { transform: translateX(8%); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes xpx-pre-slide-in-right {
          0% { transform: translateX(120%); opacity: 0; }
          60% { transform: translateX(-8%); opacity: 1; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes xpx-pre-bar-sweep {
          0% { width: 0%; left: 0%; }
          50% { width: 60%; left: 20%; }
          100% { width: 100%; left: 0%; }
        }
        @keyframes xpx-pre-fade-up {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .xpx-pre-left {
          animation: xpx-pre-slide-in-left 900ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .xpx-pre-right {
          animation: xpx-pre-slide-in-right 900ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both;
        }
        .xpx-pre-bar {
          animation: xpx-pre-bar-sweep 1500ms ease-in-out 600ms infinite;
        }
        .xpx-pre-tag {
          animation: xpx-pre-fade-up 600ms ease-out 700ms both;
        }
      `}</style>
    </div>
  );
}
