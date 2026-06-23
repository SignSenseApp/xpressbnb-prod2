import { Info } from 'lucide-react';
import { openStayScoreIntro } from '../../lib/stayScoreIntro';
import { stayScoreVisual } from './stayScoreVisual';

interface StayScoreCardChipProps {
  score: number;
  /** `card` = on listing photo; `inline` = modal / previews */
  layout?: 'card' | 'inline';
  showInfo?: boolean;
  className?: string;
  onInfoClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}

/**
 * Editorial stay-score chip — gradient rim, bold numeral, no review-star metaphor.
 */
export default function StayScoreCardChip({
  score,
  layout = 'card',
  showInfo = true,
  className = '',
  onInfoClick,
  ariaLabel,
}: StayScoreCardChipProps) {
  const isCard = layout === 'card';
  const scoreText = score.toFixed(1);
  const arcId = `stayScoreArc-${layout}-${scoreText.replace('.', '')}`;

  const handleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInfoClick?.(e);
    openStayScoreIntro();
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      style={{
        background: stayScoreVisual.gradientBorder,
        padding: '1px',
        borderRadius: isCard ? '14px' : '16px',
        boxShadow: isCard
          ? '0 10px 28px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.08)'
          : '0 12px 32px rgba(15,23,42,0.1)',
      }}
      aria-label={ariaLabel ?? `XpressBNB Stay Score ${scoreText}`}
    >
      <div
        className={`flex items-center gap-2 ${isCard ? 'px-2 py-1.5 sm:px-2.5 sm:py-2' : 'px-3 py-2.5'}`}
        style={{
          background: stayScoreVisual.chipBg,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: isCard ? '13px' : '15px',
        }}
      >
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={isCard ? 28 : 34}
            height={isCard ? 28 : 34}
            viewBox="0 0 34 34"
            aria-hidden
          >
            <circle cx="17" cy="17" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
            <circle
              cx="17"
              cy="17"
              r="14"
              fill="none"
              stroke={`url(#${arcId})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(score / 5) * 88} 88`}
              transform="rotate(-90 17 17)"
            />
            <defs>
              <linearGradient id={arcId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col leading-tight min-w-0">
          <span
            className={`font-extrabold tabular-nums tracking-tight ${isCard ? 'text-sm sm:text-base' : 'text-lg'}`}
            style={{ color: stayScoreVisual.ink }}
          >
            {scoreText}
          </span>
          <span
            className={`font-bold uppercase tracking-[0.12em] ${isCard ? 'text-[7px] sm:text-[8px]' : 'text-[9px]'}`}
            style={{ color: stayScoreVisual.muted }}
          >
            Stay Score
          </span>
        </div>

        {showInfo && (
          <button
            type="button"
            onClick={handleInfo}
            className={`shrink-0 inline-flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors ${isCard ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-8 h-8'}`}
            aria-label="What is XpressBNB Stay Score?"
          >
            <Info className={isCard ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          </button>
        )}
      </div>
    </div>
  );
}
