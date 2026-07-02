/**
 * Shared copy/helpers for property-page editorial discovery.
 * Logic only — presentation lives in `components/property/editorial/`.
 */
import type { Property } from './database.types';
import { inferEditorialEmotionalLine } from '../config/propertyDefaults';
import { listPropertyAmenities } from './amenities';

export type DiscoveryChapterCopy = {
  eyebrow: string;
  headline: string;
  lead?: string;
};

export function formatDiscoveryLocation(city: string, state: string): string {
  const c = city?.trim() ?? '';
  const s = state?.trim() ?? '';
  if (c && s) return `${c}, ${s}`;
  return c || s || 'Location coming soon';
}

export function discoveryTeaser(property: Property): string | null {
  const emotional = inferEditorialEmotionalLine(property);
  if (emotional) return emotional;

  const desc = property.description?.trim();
  if (!desc) return null;

  const first = desc.split(/[.!?]/)[0]?.trim();
  if (!first || first.length < 12) return null;
  return first.length > 120 ? `${first.slice(0, 117)}…` : first;
}

export function chapterInspiredBy(property: Property): DiscoveryChapterCopy {
  return {
    eyebrow: 'Inspired by this stay',
    headline: 'If you loved this atmosphere',
    lead: `Places that share the same spirit — for guests who lingered on ${property.title}.`,
  };
}

export function chapterSlowMornings(): DiscoveryChapterCopy {
  return {
    eyebrow: 'Collected for you',
    headline: 'For slower mornings',
    lead: 'Unhurried addresses where the day begins without urgency.',
  };
}

export function chapterWorthWaking(): DiscoveryChapterCopy {
  return {
    eyebrow: 'Continue exploring',
    headline: 'Another place worth waking up',
    lead: 'A wide view, a quieter rhythm — worth opening next.',
  };
}

export function chapterQuietEscapes(origin: Property): DiscoveryChapterCopy {
  const place = origin.city?.trim() || 'here';
  return {
    eyebrow: 'Near you',
    headline: 'Quiet escapes nearby',
    lead: `Within reach of ${place} — addresses our editors return to.`,
  };
}

export function chapterWeekendSelection(): DiscoveryChapterCopy {
  return {
    eyebrow: 'Weekend notes',
    headline: 'Three addresses for a shorter stay',
    lead: 'A horizontal rhythm of places that reward a brief detour.',
  };
}

export function chapterDestinationEssay(city: string): DiscoveryChapterCopy {
  return {
    eyebrow: 'The wider map',
    headline: `Beyond ${city}`,
    lead: 'Collections worth travelling toward — when you are ready to wander further.',
  };
}

export function chapterJournalPause(property: Property): string {
  const amenities = listPropertyAmenities(property.amenities).map((a) => a.toLowerCase());
  if (amenities.some((a) => a.includes('river') || a.includes('waterfront'))) {
    return 'The river draws a line through this valley — and through the stays that follow it downstream.';
  }
  if (amenities.some((a) => a.includes('mountain') || a.includes('view'))) {
    return 'Elevation changes everything: the light, the air, and the pace of a morning.';
  }
  return 'Discovery is not a list. It is a sequence of places that feel inevitable once you arrive.';
}
