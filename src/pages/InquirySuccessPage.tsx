import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import RequestBookSuccess from '../components/inquiry/success/RequestBookSuccess';
import { fetchPublicHost } from '../lib/hostPublicCache';
import { upsertGuestIdentityFromInquiry } from '../lib/guestIdentityFuture';
import { recordGuestInquiry } from '../lib/guestTrustStorage';
import {
  loadInquirySuccessSnapshot,
  type InquirySuccessSnapshot,
} from '../lib/inquirySuccessStorage';
import { navigateTo } from '../lib/navigation';
import { trackXpressEvent } from '../lib/analytics';
import { safeHostDisplayName } from '../lib/host';

function parseRoute(): { guestReference: string; email: string } {
  const match = window.location.pathname.match(/^\/inquiry\/success\/([^/]+)/);
  const guestReference = decodeURIComponent(match?.[1] ?? '').trim().toUpperCase();
  const email = new URLSearchParams(window.location.search).get('email')?.trim() ?? '';
  return { guestReference, email };
}

/** Fallback when guest reopens success URL — same single-screen host-first UX. */
export default function InquirySuccessPage() {
  const { guestReference, email } = useMemo(() => parseRoute(), []);
  const [snapshot, setSnapshot] = useState<InquirySuccessSnapshot | null>(() =>
    guestReference ? loadInquirySuccessSnapshot(guestReference) : null,
  );
  const [hostName, setHostName] = useState<string | null>(snapshot?.hostContactName ?? null);

  useEffect(() => {
    if (!guestReference) return;
    const loaded = loadInquirySuccessSnapshot(guestReference);
    if (loaded) setSnapshot(loaded);
  }, [guestReference]);

  useEffect(() => {
    if (!snapshot) return;
    if (email && snapshot.guestEmail.toLowerCase() !== email.toLowerCase()) return;

    recordGuestInquiry(snapshot.customerReference);
    upsertGuestIdentityFromInquiry({
      guestName: snapshot.guestName,
      guestEmail: snapshot.guestEmail,
      customerReference: snapshot.customerReference,
    });
    trackXpressEvent('inquiry_success', {
      property_id: snapshot.propertyId,
      property_slug: snapshot.propertySlug ?? undefined,
      city: snapshot.propertyCity,
      inquiry_type: snapshot.variant === 'offer' ? 'make_offer' : 'book_pay_later',
      booking_step: 'complete',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.customerReference]);

  useEffect(() => {
    if (!snapshot?.hostId) return;
    if (snapshot.hostContactName) {
      setHostName(snapshot.hostContactName);
      return;
    }
    let cancelled = false;
    void fetchPublicHost(snapshot.hostId).then((row) => {
      if (!cancelled && row) setHostName(safeHostDisplayName(row.name, 'Your host'));
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot?.hostId, snapshot?.hostContactName]);

  const emailMismatch =
    Boolean(snapshot && email && snapshot.guestEmail.toLowerCase() !== email.toLowerCase());

  if (!guestReference || !snapshot || emailMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--xpx-page)' }}>
        <SEOHead config={{ title: 'Booking request | XpressBnB', robots: 'noindex, nofollow' }} />
        <p className="text-sm text-xpx-muted text-center max-w-sm leading-relaxed">
          Open this from the property page right after sending your request, or contact support with
          your email.
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 40%)',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <SEOHead
        config={{
          title: 'Request sent | XpressBnB',
          description: 'Your booking request was sent. Contact your host directly.',
          robots: 'noindex, nofollow',
        }}
      />
      <Header
        onAboutClick={() => navigateTo('/?page=about')}
        onBlogClick={() => navigateTo('/?page=blog')}
        onHostLoginClick={() => navigateTo('/auth/login')}
      />
      <main className="mx-auto w-full max-w-lg px-4 sm:px-6 pt-8 pb-12">
        <RequestBookSuccess snapshot={snapshot} hostName={hostName} />
      </main>
    </div>
  );
}
