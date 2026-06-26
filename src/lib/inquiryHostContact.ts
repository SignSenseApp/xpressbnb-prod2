import { safeHostDisplayName } from './host';

/** Server-computed aggregate from create_pending_booking / create_make_offer_inquiry. */
export type FrequentAmigoStatus = {
  qualifyingCount: number;
  threshold: number;
  unlocked: boolean;
  windowDays: number;
};

/** Parsed from create_pending_booking / create_make_offer_inquiry (jsonb). */
export type InquirySubmitResult = {
  bookingId: string;
  customerReference?: string;
  status?: string;
  hostName?: string;
  hostPhone?: string;
  frequentAmigo?: FrequentAmigoStatus;
};

function normalizeHostPhoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d;
}

export function formatHostPhoneDisplay(digits: string): string {
  const d = normalizeHostPhoneDigits(digits);
  if (d.length !== 10) return digits;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function hostPhoneToE164(digits: string): string {
  const d = normalizeHostPhoneDigits(digits);
  return d.startsWith('91') && d.length > 10 ? `+${d}` : `+91${d}`;
}

export function buildHostDirectWhatsAppLink(
  hostPhoneDigits: string,
  propertyTitle: string,
  hostFirstName?: string,
): string {
  const greet = hostFirstName ? `Hi ${hostFirstName}` : 'Hi';
  const message = `${greet}, maine XpressBnB par "${propertyTitle}" ke liye inquiry bheji hai. Kya dates available hain?`;
  const cleaned = normalizeHostPhoneDigits(hostPhoneDigits);
  const wa = cleaned.length > 10 ? cleaned : `91${cleaned}`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

export function parseFrequentAmigoStatus(data: unknown): FrequentAmigoStatus | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const qualifyingCount = Number(o.qualifying_count ?? o.qualifyingCount);
  const threshold = Number(o.threshold ?? 3);
  const windowDays = Number(o.window_days ?? o.windowDays ?? 15);
  if (!Number.isFinite(qualifyingCount) || qualifyingCount < 0) return null;
  const unlocked =
    o.unlocked === true ||
    (Number.isFinite(threshold) && qualifyingCount >= threshold);
  return {
    qualifyingCount,
    threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 3,
    unlocked,
    windowDays: Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 15,
  };
}

/** Accepts jsonb object or legacy plain uuid string from older RPC versions. */
export function parseInquirySubmitResult(data: unknown): InquirySubmitResult | null {
  if (typeof data === 'string' && /^[0-9a-f-]{36}$/i.test(data)) {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const bookingId = String(o.booking_id ?? o.bookingId ?? '');
  const customerReference = String(o.customer_reference ?? o.customerReference ?? '') || undefined;
  const hostPhone = String(o.host_phone ?? o.hostPhone ?? '');
  const hostNameRaw = String(o.host_name ?? o.hostName ?? '');
  if (!bookingId) return null;
  const frequentAmigo = parseFrequentAmigoStatus(o.frequent_amigo ?? o.frequentAmigo);
  return {
    bookingId,
    ...(customerReference ? { customerReference } : {}),
    status: o.status ? String(o.status) : undefined,
    ...(hostPhone
      ? {
          hostPhone: normalizeHostPhoneDigits(hostPhone),
          hostName: safeHostDisplayName(hostNameRaw, 'Host'),
        }
      : {}),
    ...(frequentAmigo ? { frequentAmigo } : {}),
  };
}
