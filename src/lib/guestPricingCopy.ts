/** Guest pricing microcopy — calm, factual, no OTA hype. */

export const GUEST_PRICING_NO_COMMISSION = 'No guest commission.';

export const GUEST_PRICING_INQUIRY_TOTAL_NOTE =
  'The amount shown is the amount your request is sent with.';

export const GUEST_PRICING_HOST_DIRECT =
  'Hosts receive your request directly.';

export const GUEST_PRICING_TRANSPARENT =
  'Transparent pricing — no platform fees added at checkout.';

export const GUEST_PRICING_NIGHTLY_HINT =
  'Nightly rate — select dates to see your trip total.';

export const GUEST_PRICING_TRIP_HINT = (nights: number) =>
  `${nights} ${nights === 1 ? 'night' : 'nights'} · host-listed total`;

export function guestRequestSentCopy(totalInr: string): string {
  return `Your request for ${totalInr} was sent to the host.`;
}
