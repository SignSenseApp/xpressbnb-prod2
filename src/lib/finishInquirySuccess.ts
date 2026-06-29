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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
  ]);
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
    prepareGuestId: () => {
      upsertGuestIdentityFromInquiry({
        guestName: snap.guestName,
        guestEmail: snap.guestEmail,
        customerReference: snap.customerReference,
      });
      recordGuestInquiry(snap.customerReference);
    },
    finalizeDashboard: () => {
      trackXpressEvent('inquiry_success', {
        property_id: snap.propertyId,
        property_slug: snap.propertySlug ?? undefined,
        city: snap.propertyCity,
        inquiry_type: snap.variant === 'offer' ? 'make_offer' : 'book_pay_later',
        booking_step: 'complete',
      });
    },
  });

  return snap;
}

/**
 * Runs the post-submit pipeline then signals when welcome navigation should occur.
 */
export async function completeInquirySubmission(input: {
  snapshot: InquirySuccessSnapshot;
  onPhase: (phase: InquiryTransitionPhase) => void;
  onReadyToNavigate: (snapshot: InquirySuccessSnapshot) => void;
}): Promise<void> {
  const finish = (snap: InquirySuccessSnapshot) => {
    input.onPhase(4);
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion ? 80 : 400;
    window.setTimeout(() => input.onReadyToNavigate(snap), delay);
  };

  try {
    const finalSnap = await runInquirySuccessPipeline({
      snapshot: input.snapshot,
      onPhase: input.onPhase,
    });
    finish(finalSnap);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Inquiry success pipeline failed — navigating with snapshot:', error);
    }
    finish(input.snapshot);
  }
}
