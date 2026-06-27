import { Lock, History, Mail } from 'lucide-react';

const PRIVACY_POINTS = [
  {
    icon: Lock,
    title: 'Private by default',
    body: 'Your contact details stay with XpressBnB until an inquiry is reviewed.',
  },
  {
    icon: History,
    title: 'Your history',
    body: 'Guest ID links inquiries on this device — no public profile or social feed.',
  },
  {
    icon: Mail,
    title: 'Future inquiries',
    body: 'Use the same email and we can recognise your pattern — still no account required.',
  },
] as const;

type GuestIdProfileCardProps = {
  className?: string;
};

/**
 * Post-inquiry Guest ID education — Apple Wallet calm, not gamified.
 */
export default function GuestIdProfileCard({ className = '' }: GuestIdProfileCardProps) {
  return (
    <section
      className={`rounded-2xl overflow-hidden text-left ${className}`}
      style={{
        background: 'linear-gradient(165deg, #f8fafc 0%, #ffffff 55%)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 10px 32px rgba(15,23,42,0.04)',
      }}
      aria-labelledby="guest-id-profile-heading"
    >
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
          Guest profile
        </p>
        <h4
          id="guest-id-profile-heading"
          className="mt-1 text-base sm:text-lg font-extrabold text-xpx-text tracking-tight"
        >
          Your Guest ID is ready
        </h4>
        <p className="mt-2 text-sm text-xpx-muted leading-relaxed">
          Think of it as a private reference — like a wallet pass. It is not a login, a score, or a
          public badge.
        </p>
      </div>
      <ul className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">
        {PRIVACY_POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--xpx-verified-bg)' }}
              aria-hidden
            >
              <Icon className="h-4 w-4" style={{ color: 'var(--xpx-verified)' }} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-xpx-text">{title}</p>
              <p className="mt-0.5 text-xs text-xpx-muted leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
