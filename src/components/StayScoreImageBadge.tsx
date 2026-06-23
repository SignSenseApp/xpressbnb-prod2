import { useEffect } from 'react';
import {
  computeXpressbnbStayScore,
  type ListingQualitySignals,
} from '../lib/xpressbnbStayScore';
import { requestStayScoreIntroAutoShow } from '../lib/stayScoreIntro';
import StayScoreCardChip from './stayScore/StayScoreCardChip';

interface StayScoreImageBadgeProps {
  signals: ListingQualitySignals;
  className?: string;
  onPointerInteraction?: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

/**
 * Dribbble-style stay score chip on listing photos.
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

  return (
    <StayScoreCardChip
      score={score}
      layout="card"
      className={className}
      ariaLabel={label}
      onInfoClick={onPointerInteraction}
    />
  );
}
