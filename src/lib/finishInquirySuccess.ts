import { trackXpressEvent } from './analytics';
import { upsertGuestIdentityFromInquiry } from './guestIdentityFuture';
import { safeHostDisplayName } from './host';
import { fetchPublicHost } from './hostPublicCache';
import { recordGuestInquiry } from './guestTrustStorage';
import {
  saveInquirySuccessSnapshot,
  type InquirySuccessSnapshot,
} from './inquirySuccessStorage';
import type { InquiryTransitionPhase } from './inquirySuccessMotion';
import { runPostSubmitTransitionPhases } from './inquirySubmitTransition';

const HOST_LOOKUP_TIMEOUT_MS = 4000;
/** Hard ceiling — navigate even if transition pipeline stalls (production P0 guard). */
const NAVIGATION_FALLBACK_MS = 3000;
const WELCOME_DWELL_MS = 320;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
  ]);
}

function syncGuestIdentity(snapshot: InquirySuccessSnapshot): void {
  upsertGuestIdentityFromInquiry({
    guestName: snapshot.guestName,
    guestEmail: snapshot.guestEmail,
    customerReference: snapshot.customerReference,
  });
  recordGuestInquiry(snapshot.customerReference);
  trackXpressEvent('inquiry_success', {
    property_id: snapshot.propertyId,
    property_slug: snapshot.propertySlug ?? undefined,
    city: snapshot.propertyCity,
    inquiry_type: snapshot.variant === 'offer' ? 'make_offer' : 'book_pay_later',
    booking_step: 'complete',
  });
}

export async function runInquirySuccessPipeline(input: {
  snapshot: InquirySuccessSnapshot;
  onPhase: (phase: InquiryTransitionPhase) => void;
}): Promise<InquirySuccessSnapshot> {
  let snap = input.snapshot;

  await runPostSubmitTransitionPhases({
    onPhase: input.onPhase,
    resolveHost: async () => {
      if (snap.hostContactName || !snap.hostId) return;
      const row = await withTimeout(fetchPublicHost(snap.hostId), HOST_LOOKUP_TIMEOUT_MS);
      if (!row) return;
      const hostContactName = safeHostDisplayName(row.name, 'Your host');
      snap = { ...snap, hostContactName };
      saveInquirySuccessSnapshot(snap);
    },
    prepareGuestId: async () => {
      /* Guest identity synced in completeInquiryAfterSubmit before pipeline runs */
    },
  });

  return snap;
}

type CompleteInquiryAfterSubmitInput = {
  snapshot: InquirySuccessSnapshot;
  onPhase: (phase: InquiryTransitionPhase) => void;
  onNavigate: (snapshot: InquirySuccessSnapshot) => void;
  navigatedRef: { current: boolean };
};

/**
 * Post-submit handler — identity sync is immediate; welcome navigation always fires
 * (pipeline success, pipeline error, or hard fallback timeout).
 */
export function completeInquiryAfterSubmit(input: CompleteInquiryAfterSubmitInput): void {
  syncGuestIdentity(input.snapshot);

  const go = (snap: InquirySuccessSnapshot) => {
    if (input.navigatedRef.current) return;
    input.onPhase(4);
    window.setTimeout(() => input.onNavigate(snap), WELCOME_DWELL_MS);
  };

  const fallbackTimer = window.setTimeout(() => {
    go(input.snapshot);
  }, NAVIGATION_FALLBACK_MS);

  void runInquirySuccessPipeline({
    snapshot: input.snapshot,
    onPhase: input.onPhase,
  })
    .then((finalSnap) => {
      window.clearTimeout(fallbackTimer);
      go(finalSnap);
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Inquiry success pipeline failed — using fallback navigation:', error);
      }
      window.clearTimeout(fallbackTimer);
      go(input.snapshot);
    });
}

/** @deprecated Use completeInquiryAfterSubmit */
export async function completeInquirySubmission(input: {
  snapshot: InquirySuccessSnapshot;
  onPhase: (phase: InquiryTransitionPhase) => void;
  onReadyToNavigate: (snapshot: InquirySuccessSnapshot) => void;
}): Promise<void> {
  const navigatedRef = { current: false };
  completeInquiryAfterSubmit({
    snapshot: input.snapshot,
    onPhase: input.onPhase,
    navigatedRef,
    onNavigate: (snap) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      input.onReadyToNavigate(snap);
    },
  });
}
