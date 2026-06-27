import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import SEOHead from '../components/SEOHead';
import CustomerReferenceField from '../components/inquiry/CustomerReferenceField';
import FrequentAmigoProgress from '../components/FrequentAmigoProgress';
import GuestPassportCard from '../components/inquiry/success/GuestPassportCard';
import InquiryHostContactCard from '../components/inquiry/success/InquiryHostContactCard';
import InquirySuccessJourneyTimeline from '../components/inquiry/success/InquirySuccessJourneyTimeline';
import InquirySuccessNextSteps from '../components/inquiry/success/InquirySuccessNextSteps';
import ContinueAsGuestIdentity from '../components/inquiry/success/ContinueAsGuestIdentity';
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

function formatTripDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

  const handleTrack = () => {
    if (!snapshot) return;
    const params = new URLSearchParams({
      ref: snapshot.customerReference,
      email: snapshot.guestEmail,
    });
    navigateTo(`/track-inquiry?${params.toString()}`);
  };

  if (!guestReference) {
    return <InquirySuccessFallback message="We couldn't find your inquiry reference." />;
  }

  if (!snapshot || emailMismatch) {
    return (
      <InquirySuccessFallback
        message={
          emailMismatch
            ? 'This link does not match the email on your inquiry. Open the link from your confirmation or track with your Guest ID.'
            : 'Open this page right after submitting your inquiry on the same device, or track with your Guest ID and email.'
        }
        guestReference={guestReference}
        email={email}
      />
    );
  }

  const createdAt = new Date(snapshot.savedAt);
  const hostPhone = snapshot.hostContactPhone;

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 28%, #f8fafc 100%)',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <SEOHead
        config={{
          title: 'Inquiry sent | XpressBnB',
          description: 'Your travel request was shared with the host. Track with your private Guest ID.',
          robots: 'noindex, nofollow',
        }}
      />
      <Header
        onAboutClick={() => navigateTo('/?page=about')}
        onBlogClick={() => navigateTo('/?page=blog')}
        onHostLoginClick={() => navigateTo('/auth/login')}
      />

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-6 sm:pt-10 pb-12">
        <header className="text-center inquiry-reveal motion-reduce:animate-none">
          <div
            className="mx-auto mb-6 h-36 w-36 sm:h-44 sm:w-44 rounded-[2rem] overflow-hidden"
            style={{
              boxShadow: '0 28px 72px rgba(5,150,105,0.14)',
              border: '1px solid rgba(5,150,105,0.15)',
            }}
          >
            <img
              src="/images/inquiry/inquiry-success-hero.svg"
              alt=""
              width={176}
              height={176}
              className="h-full w-full object-cover"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
            Inquiry confirmed
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-xpx-text tracking-tight leading-[1.1] text-balance">
            Your travel request is on its way.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-xpx-muted leading-relaxed max-w-xl mx-auto text-balance">
            We&apos;ve successfully shared your inquiry with the host. You can continue the
            conversation directly while tracking everything through your private Guest ID.
          </p>
        </header>

        <div className="mt-10 sm:mt-12 space-y-6 sm:space-y-8">
          <GuestPassportCard
            guestName={snapshot.guestName}
            customerReference={snapshot.customerReference}
            createdAt={createdAt}
          />

          <InquiryHostContactCard
            hostName={hostName}
            propertyTitle={snapshot.propertyTitle}
            hostPhoneDigits={hostPhone}
          />

          <section
            className="rounded-3xl p-5 sm:p-6 inquiry-reveal motion-reduce:animate-none"
            style={{
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border)',
              boxShadow: '0 12px 40px rgba(15,23,42,0.04)',
            }}
            aria-labelledby="journey-heading"
          >
            <h2
              id="journey-heading"
              className="text-lg sm:text-xl font-extrabold text-xpx-text tracking-tight"
            >
              Inquiry timeline
            </h2>
            <div className="mt-5">
              <InquirySuccessJourneyTimeline />
            </div>
          </section>

          <InquirySuccessNextSteps />

          <section
            className="rounded-3xl p-5 sm:p-6 inquiry-reveal motion-reduce:animate-none"
            style={{
              background: 'var(--xpx-surface)',
              border: '1px solid var(--xpx-border)',
            }}
            aria-label="Trip summary"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
              Your request
            </p>
            <p className="mt-1 text-base font-bold text-xpx-text">{snapshot.propertyTitle}</p>
            <p className="mt-1 text-sm text-xpx-muted">
              {formatTripDate(snapshot.checkIn)} → {formatTripDate(snapshot.checkOut)} ·{' '}
              {snapshot.numGuests} guest{snapshot.numGuests === 1 ? '' : 's'}
            </p>
            <p className="mt-2 text-sm font-semibold text-xpx-text tabular-nums">
              ₹{snapshot.estimatedTotal.toLocaleString('en-IN')}
            </p>
          </section>

          <ContinueAsGuestIdentity
            guestName={snapshot.guestName}
            customerReference={snapshot.customerReference}
          />

          {snapshot.frequentAmigo && (
            <FrequentAmigoProgress status={snapshot.frequentAmigo} />
          )}

          <div
            className="rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 inquiry-reveal motion-reduce:animate-none"
            style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%)',
              border: '1px solid rgba(5,150,105,0.2)',
            }}
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-xpx-text">Track anytime</p>
              <p className="mt-1 text-xs text-xpx-muted leading-relaxed">
                Guest ID + email — no password required today.
              </p>
              <div className="mt-3">
                <CustomerReferenceField reference={snapshot.customerReference} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleTrack}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] motion-reduce:transition-none"
              style={{
                background: 'var(--xpx-verified)',
                boxShadow: '0 10px 28px rgba(5,150,105,0.28)',
              }}
            >
              Track inquiry
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <figure className="text-center inquiry-reveal motion-reduce:animate-none">
            <img
              src="/images/inquiry/tracking-works.svg"
              alt=""
              width={320}
              height={200}
              className="mx-auto max-w-full h-auto rounded-2xl"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="sr-only">How tracking works with your Guest ID</figcaption>
          </figure>
        </div>
      </main>
    </div>
  );
}

function InquirySuccessFallback({
  message,
  guestReference,
  email,
}: {
  message: string;
  guestReference?: string;
  email?: string;
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--xpx-page, #F8FAFC)' }}>
      <SEOHead config={{ title: 'Inquiry | XpressBnB', robots: 'noindex, nofollow' }} />
      <Header
        onAboutClick={() => navigateTo('/?page=about')}
        onBlogClick={() => navigateTo('/?page=blog')}
        onHostLoginClick={() => navigateTo('/auth/login')}
      />
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-xpx-muted leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();
            if (guestReference) params.set('ref', guestReference);
            if (email) params.set('email', email);
            const q = params.toString();
            navigateTo(q ? `/track-inquiry?${q}` : '/track-inquiry');
          }}
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-2xl px-6 py-3 text-sm font-bold text-white"
          style={{ background: 'var(--xpx-verified)' }}
        >
          Track inquiry
        </button>
      </main>
    </div>
  );
}
