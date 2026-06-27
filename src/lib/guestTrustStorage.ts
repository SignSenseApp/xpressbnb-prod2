/**
 * Anonymous guest trust history — localStorage only (no accounts).
 * Stores inquiry references and track outcomes; never stores email or phone.
 */

import type { InquiryTrackResult } from './inquirySubmit';

export const GUEST_TRUST_STORAGE_KEY = 'xpx_guest_trust_v1';

export type GuestInquiryRecord = {
  customerReference: string;
  submittedAt: number;
  lastDisplayStatus?: string;
  reviewedAt?: string | null;
  phoneVerified?: boolean;
};

export type GuestTrustStore = {
  v: 1;
  inquiries: GuestInquiryRecord[];
  /** User opened track-inquiry with a reference */
  hasTrackedPage: boolean;
};

const EMPTY_STORE: GuestTrustStore = { v: 1, inquiries: [], hasTrackedPage: false };

function readStore(): GuestTrustStore {
  if (typeof window === 'undefined') return { ...EMPTY_STORE, inquiries: [] };
  try {
    const raw = localStorage.getItem(GUEST_TRUST_STORAGE_KEY);
    if (!raw) return { ...EMPTY_STORE, inquiries: [] };
    const parsed = JSON.parse(raw) as Partial<GuestTrustStore>;
    const inquiries = Array.isArray(parsed.inquiries)
      ? parsed.inquiries.filter(
          (row): row is GuestInquiryRecord =>
            Boolean(row) &&
            typeof row === 'object' &&
            typeof (row as GuestInquiryRecord).customerReference === 'string' &&
            typeof (row as GuestInquiryRecord).submittedAt === 'number',
        )
      : [];
    return {
      v: 1,
      inquiries,
      hasTrackedPage: Boolean(parsed.hasTrackedPage),
    };
  } catch {
    return { ...EMPTY_STORE, inquiries: [] };
  }
}

function writeStore(store: GuestTrustStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_TRUST_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function getGuestTrustStore(): GuestTrustStore {
  return readStore();
}

export function recordGuestInquiry(customerReference: string): void {
  const ref = customerReference.trim().toUpperCase();
  if (!ref) return;
  const store = readStore();
  const existing = store.inquiries.find((row) => row.customerReference === ref);
  if (existing) return;
  store.inquiries.push({ customerReference: ref, submittedAt: Date.now() });
  writeStore(store);
}

export function updateGuestInquiryFromTrack(result: InquiryTrackResult): void {
  const ref = result.customerReference.trim().toUpperCase();
  if (!ref) return;
  const store = readStore();
  const idx = store.inquiries.findIndex((row) => row.customerReference === ref);
  const patch: GuestInquiryRecord = {
    customerReference: ref,
    submittedAt: idx >= 0 ? store.inquiries[idx].submittedAt : Date.now(),
    lastDisplayStatus: result.displayStatus,
    reviewedAt: result.reviewedAt,
    phoneVerified: result.phoneVerified,
  };
  if (idx >= 0) {
    store.inquiries[idx] = { ...store.inquiries[idx], ...patch };
  } else {
    store.inquiries.push(patch);
  }
  store.hasTrackedPage = true;
  writeStore(store);
}

export function markGuestTrackPageVisited(): void {
  const store = readStore();
  if (store.hasTrackedPage) return;
  store.hasTrackedPage = true;
  writeStore(store);
}
