import { useEffect } from 'react';
import { Sparkles, Info } from 'lucide-react';
import {
  computeXpressbnbStayScore,
  type ListingQualitySignals,
} from '../lib/xpressbnbStayScore';
import {
  openStayScoreIntro,
  requestStayScoreIntroAutoShow,
} from '../lib/stayScoreIntro';

interface StayScoreImageBadgeProps {
  signals: ListingQualitySignals;
  className?: string;
  /** Stop card navigation when tapping info. */
  onPointerInteraction?: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

/**
 * Glass pill on listing photos — compact Stay Score, tap info for explainer.
 */
export default function StayScoreImageBadge({
  signals,
  className = '',
  onPointerInteraction,
}: StayScoreImageBadgeProps) {
  const { score, label } = computeXpressbnbStayScore(signals);

  useEffect(() => {
    requestStayScoreIntroAutoShow();
  }, []);

  const stopNav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPointerInteraction?.(e);
  };

  const openInfo = (e: React.MouseEvent) => {
    stopNav(e);
    openStayScoreIntro();
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full font-bold text-white tabular-nums shadow-[0_8px_24px_rgba(15,23,42,0.22)] ${className}`}
      style={{
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.22)',
      }}
      aria-label={label}
    >
      <span className="inline-flex items-center gap-1 pl-2 pr-1 py-1 sm:py-1.5 text-[11px] sm:text-xs">
        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-sky-200" aria-hidden />
        <span>{score.toFixed(1)}</span>
        <span className="hidden sm:inline font-semibold text-white/85 text-[10px] sm:text-[11px]">
          Stay Score
        </span>
      </span>
      <button
        type="button"
        onClick={openInfo}
        className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full mr-0.5 text-white/90 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="What is XpressBNB Stay Score?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
