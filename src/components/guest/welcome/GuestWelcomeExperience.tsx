import { useMemo } from 'react';
import InquiryHostContactCard from '../../inquiry/success/InquiryHostContactCard';
import GuestDigitalPassport from './GuestDigitalPassport';
import GuestIdentityBenefits from './GuestIdentityBenefits';
import GuestMemberTimeline from './GuestMemberTimeline';
import GuestSecureAccountTeaser from './GuestSecureAccountTeaser';
import type { InquirySuccessSnapshot } from '../../../lib/inquirySuccessStorage';
import { formatInr } from '../../../lib/guestPricingEngine';
import { guestRequestSentCopy } from '../../../lib/guestPricingCopy';
import { navigateTo } from '../../../lib/navigation';
import { GuestWelcomeContinueLater } from './GuestSecureAccountTeaser';

type GuestWelcomeExperienceProps = {
  snapshot: InquirySuccessSnapshot;
  hostName: string | null;
};

function formatTripDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GuestWelcomeExperience({ snapshot, hostName }: GuestWelcomeExperienceProps) {
  const createdAt = useMemo(() => new Date(snapshot.savedAt), [snapshot.savedAt]);
  const propertyPath = snapshot.propertySlug
    ? `/property/${snapshot.propertySlug}`
    : `/property/${snapshot.propertyId}`;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="flex items-start justify-between gap-4 mb-10 sm:mb-12 inquiry-reveal motion-reduce:animate-none">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
            Welcome
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-xpx-text tracking-tight leading-[1.08] text-balance">
            You&apos;re an XpressBnB member now
          </h1>
          <p className="mt-3 text-base sm:text-lg text-xpx-muted leading-relaxed max-w-prose">
            {guestRequestSentCopy(formatInr(snapshot.estimatedTotal))}
          </p>
          <p className="mt-2 text-sm text-xpx-subtle">
            {snapshot.propertyTitle} · {formatTripDate(snapshot.checkIn)} →{' '}
            {formatTripDate(snapshot.checkOut)}
          </p>
        </div>
        <GuestWelcomeContinueLater className="md:hidden shrink-0" />
      </header>

      <GuestDigitalPassport
        guestName={snapshot.guestName}
        customerReference={snapshot.customerReference}
        createdAt={createdAt}
        className="mb-10 sm:mb-12"
      />

      <div className="mb-10 sm:mb-12 space-y-3 inquiry-host-reveal motion-reduce:animate-none">
        <p className="text-sm text-xpx-muted leading-relaxed">
          Your inquiry has also been shared with the host.
        </p>
        <p className="text-sm text-xpx-muted leading-relaxed">
          We recommend introducing yourself before travelling.
        </p>
        <InquiryHostContactCard
          hostName={hostName}
          propertyTitle={snapshot.propertyTitle}
          hostPhoneDigits={snapshot.hostContactPhone}
          prominent
        />
      </div>

      <GuestMemberTimeline className="mb-10 sm:mb-12" />

      <GuestIdentityBenefits className="mb-10 sm:mb-12" />

      <GuestSecureAccountTeaser className="mb-10" />

      <div
        className="sticky bottom-0 z-10 -mx-4 px-4 py-4 sm:static sm:mx-0 sm:px-0 sm:py-0 inquiry-reveal motion-reduce:animate-none"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          background: 'var(--xpx-page, #f8fafc)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigateTo(propertyPath)}
            className="w-full min-h-[52px] rounded-2xl px-5 text-base font-bold text-white transition-transform active:scale-[0.98] motion-reduce:transition-none"
            style={{
              background: 'var(--xpx-warm, #50C878)',
              boxShadow: '0 10px 32px rgba(80,200,120,0.28)',
            }}
          >
            Continue browsing
          </button>
          <button
            type="button"
            onClick={() =>
              navigateTo(
                `/track-inquiry?ref=${encodeURIComponent(snapshot.customerReference)}&email=${encodeURIComponent(snapshot.guestEmail)}`,
              )
            }
            className="w-full min-h-[52px] rounded-2xl px-5 text-base font-semibold text-xpx-text border border-xpx-border-strong bg-white"
          >
            Track inquiry
          </button>
        </div>
      </div>
    </div>
  );
}
