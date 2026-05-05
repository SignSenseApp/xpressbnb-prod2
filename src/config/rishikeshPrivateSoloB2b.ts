/**
 * B2B pricing for Private Solo show — Rishikesh only.
 * Typed for future Supabase `city_marketing_blocks`-style payloads (same shape).
 */

export interface PrivateSoloB2bTier {
  /** Display label, e.g. "15 mins". */
  durationLabel: string;
  durationMinutes: number;
  priceInr: number;
}

export interface RishikeshPrivateSoloB2bContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Small supporting visual to make the block feel premium and editorial. */
  heroImageUrl: string;
  heroImageAlt: string;
  /** Optional one-liner: enquiries go via XpressBnB first, not direct to artist. */
  routingNote?: string;
  footnote: string;
  /** Prefilled WhatsApp body for B2B enquiries (professional, trackable). */
  whatsappPrefill: string;
  tiers: PrivateSoloB2bTier[];
}

export const RISHIKESH_PRIVATE_SOLO_B2B: RishikeshPrivateSoloB2bContent = {
  eyebrow: 'For organisers · Rishikesh',
  title: 'Private solo show · B2B rates',
  subtitle: 'For corporates, retreats, and private bookings.',
  heroImageUrl:
    'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&w=1000',
  heroImageAlt: 'Live music performer on stage in warm lights',
  routingNote:
    'Enquiries are handled by our team; we coordinate dates with the artist.',
  footnote: 'Indicative rates — confirm dates and availability.',
  whatsappPrefill:
    'Hi — I would like to enquire about a Private Solo show in Rishikesh (B2B). Please share availability and next steps.',
  tiers: [
    { durationLabel: '15 mins', durationMinutes: 15, priceInr: 1500 },
    { durationLabel: '30 mins', durationMinutes: 30, priceInr: 2500 },
    { durationLabel: '45 mins', durationMinutes: 45, priceInr: 3500 },
    { durationLabel: '60 mins', durationMinutes: 60, priceInr: 4500 },
  ],
};
