/**
 * Personalized homepage feed ordering — conversion-optimized rail sequence.
 */

import type { DestinationRail } from './destinationRecommendations';

const RAIL_PRIORITY: Record<string, number> = {
  nearby: 0,
  weekend: 1,
  luxury: 2,
  family: 3,
  longstay: 4,
  mountain: 5,
  romantic: 6,
  workation: 7,
};

export function orderFeedRails(rails: DestinationRail[]): DestinationRail[] {
  return [...rails].sort((a, b) => {
    const pa = RAIL_PRIORITY[a.id] ?? 50;
    const pb = RAIL_PRIORITY[b.id] ?? 50;
    return pa - pb;
  });
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
