import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import GuestWelcomeExperience from '../components/guest/welcome/GuestWelcomeExperience';
import { fetchPublicHost } from '../lib/hostPublicCache';
import { upsertGuestIdentityFromInquiry } from '../lib/guestIdentityFuture';
import { recordGuestInquiry } from '../lib/guestTrustStorage';
import {
  loadInquirySuccessSnapshot,
  type InquirySuccessSnapshot,
} from '../lib/inquirySuccessStorage';
import { parseGuestWelcomeRoute } from '../lib/guestWelcomePath';
import { navigateTo } from '../lib/navigation';
import { trackXpressEvent } from '../lib/analytics';
import { safeHostDisplayName } from '../lib/host';

export default function GuestWelcomePage() {
  const { guestReference, email } = useMemo(
    () => parseGuestWelcomeRoute(window.location.pathname),
    [],
  );
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
      booking_step: 'welcome',
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
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-4"
        style={{ background: 'var(--xpx-page)' }}
      >
        <SEOHead config={{ title: 'Guest welcome | XpressBnB', robots: 'noindex, nofollow' }} />
        <p className="text-sm text-xpx-muted text-center max-w-sm leading-relaxed">
          Open this from the property page right after sending your request, or track your inquiry
          with your Guest ID and email.
        </p>
        <button
          type="button"
          onClick={() => navigateTo('/track-inquiry')}
          className="min-h-[48px] px-5 rounded-xl text-sm font-semibold text-xpx-text border border-xpx-border-strong bg-white"
        >
          Track inquiry
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: 'var(--xpx-page, #f8fafc)',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <SEOHead
        config={{
          title: `Welcome, ${snapshot.guestName.trim() || 'Guest'} | XpressBnB`,
          description: 'Your inquiry was received. WhatsApp your host to confirm your stay.',
          robots: 'noindex, nofollow',
        }}
      />
      <Header
        onAboutClick={() => navigateTo('/?page=about')}
        onBlogClick={() => navigateTo('/?page=blog')}
        onHostLoginClick={() => navigateTo('/auth/login')}
        showGuestSession
      />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8 pt-5 sm:pt-10 pb-20 sm:pb-16">
        <GuestWelcomeExperience snapshot={snapshot} hostName={hostName} />
      </main>
    </div>
  );
}
