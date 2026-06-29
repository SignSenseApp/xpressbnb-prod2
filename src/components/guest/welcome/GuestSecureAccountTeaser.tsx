import { getSecureAccountCopy, loadGuestIdentity } from '../../../lib/guestIdentityFuture';
import { navigateTo } from '../../../lib/navigation';

type GuestSecureAccountTeaserProps = {
  className?: string;
};

/** Shown only after a verified / booked / completed stay — never on first inquiry. */
export default function GuestSecureAccountTeaser({ className = '' }: GuestSecureAccountTeaserProps) {
  const identity = loadGuestIdentity();
  if (!identity || identity.phase !== 'eligible_for_password') return null;

  const copy = getSecureAccountCopy();

  return (
    <section
      className={`rounded-2xl p-5 sm:p-6 text-left inquiry-reveal motion-reduce:animate-none ${className}`}
      style={{
        background: 'var(--xpx-surface-light)',
        border: '1px solid var(--xpx-border)',
      }}
      aria-labelledby="secure-account-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
        Optional
      </p>
      <h3
        id="secure-account-heading"
        className="mt-1 text-lg sm:text-xl font-extrabold text-xpx-text tracking-tight"
      >
        {copy.title}
      </h3>
      <p className="mt-2 text-sm text-xpx-muted leading-relaxed">{copy.body}</p>
      <button
        type="button"
        disabled
        className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-semibold text-xpx-muted border border-xpx-border bg-white opacity-70 cursor-not-allowed"
        aria-describedby="secure-account-soon"
      >
        {copy.cta}
      </button>
      <p id="secure-account-soon" className="mt-2 text-xs text-xpx-subtle">
        Coming soon — your inquiries remain available with your Guest ID until then.
      </p>
    </section>
  );
}

export function GuestWelcomeContinueLater({
  className = '',
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => navigateTo('/')}
      className={`text-xs sm:text-sm font-semibold text-xpx-muted hover:text-xpx-text transition-colors min-h-[48px] px-2 ${className}`}
    >
      Continue later
    </button>
  );
}
