import { BadgeCheck, User } from 'lucide-react';
import {
  formatIssueDateLabel,
  formatMemberSinceLabel,
  guestInitials,
} from '../../../lib/inquirySuccessMotion';

type GuestDigitalPassportProps = {
  guestName: string;
  customerReference: string;
  createdAt?: Date;
  className?: string;
};

export default function GuestDigitalPassport({
  guestName,
  customerReference,
  createdAt,
  className = '',
}: GuestDigitalPassportProps) {
  const initials = guestInitials(guestName);
  const memberSince = formatMemberSinceLabel(createdAt);
  const issueDate = formatIssueDateLabel(createdAt);
  const displayName = guestName.trim() || 'Guest';

  return (
    <article className={`text-left ${className}`} aria-label="Digital guest passport">
      <div className="flex items-start gap-4 sm:gap-5">
        <div
          className="flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-xpx-text"
          style={{
            background: 'var(--xpx-surface-light, #f8fafc)',
            border: '1px solid var(--xpx-border, #e2e8f0)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
          aria-hidden
        >
          <User className="h-7 w-7 text-xpx-muted" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
            Private travel member
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight truncate">
            {displayName}
          </h2>
          <p className="mt-1 font-mono text-sm font-semibold text-xpx-muted tabular-nums">
            {customerReference}
          </p>
          <p className="mt-1 text-xs text-xpx-muted">Member since {memberSince}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            Verified guest identity
          </p>
        </div>

        <div
          className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-bold text-xpx-text"
          style={{
            background: '#fff',
            border: '1px solid var(--xpx-border)',
            boxShadow: 'inset 0 2px 4px rgba(15,23,42,0.04), 0 1px 0 rgba(255,255,255,0.9)',
          }}
          aria-hidden
        >
          {initials}
        </div>
      </div>

      <div
        className="mt-6 rounded-2xl p-5 sm:p-6 inquiry-reveal motion-reduce:animate-none guest-passport-emboss"
        style={{
          background: '#fff',
          border: '1px solid var(--xpx-border-strong, #cbd5e1)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-xpx-subtle">
          Travel passport
        </p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
              Guest ID
            </dt>
            <dd className="mt-1 font-mono text-base sm:text-lg font-bold text-xpx-text tabular-nums">
              {customerReference}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
              Issue date
            </dt>
            <dd className="mt-1 text-sm sm:text-base font-semibold text-xpx-text">{issueDate}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
              Status
            </dt>
            <dd className="mt-1 text-sm sm:text-base font-semibold text-emerald-800">
              Inquiry submitted
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
