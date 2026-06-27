import { Globe2, Shield } from 'lucide-react';
import { formatCreatedTodayLabel, guestInitials } from '../../../lib/inquirySuccessMotion';

type GuestPassportCardProps = {
  guestName: string;
  customerReference: string;
  createdAt?: Date;
  className?: string;
};

export default function GuestPassportCard({
  guestName,
  customerReference,
  createdAt,
  className = '',
}: GuestPassportCardProps) {
  const initials = guestInitials(guestName);
  const createdLabel = formatCreatedTodayLabel(createdAt);

  return (
    <article
      className={`relative overflow-hidden rounded-3xl text-left inquiry-reveal motion-reduce:animate-none ${className}`}
      style={{
        background:
          'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(236,253,245,0.55) 100%)',
        border: '1px solid rgba(5,150,105,0.22)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.8) inset, 0 24px 64px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.02)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      aria-label="Guest passport"
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.25) 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800/80">
              Private travel identity
            </p>
            <h3 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight truncate">
              {guestName.trim() || 'Guest'}
            </h3>
            <p className="mt-1 text-xs text-xpx-muted">Created {createdLabel}</p>
          </div>

          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{
              background: 'linear-gradient(145deg, #059669 0%, #047857 100%)',
              boxShadow: '0 8px 24px rgba(5,150,105,0.35)',
            }}
            aria-hidden
          >
            <span className="relative z-10">{initials}</span>
            <Globe2
              className="absolute -bottom-1 -right-1 h-4 w-4 text-emerald-200"
              strokeWidth={2.5}
            />
          </div>
        </div>

        <div
          className="mt-5 rounded-2xl px-4 py-3.5"
          style={{
            background: 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(5,150,105,0.12)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">
            Guest ID
          </p>
          <p className="mt-1 font-mono text-lg sm:text-xl font-bold text-xpx-text tracking-wide tabular-nums">
            {customerReference}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-xpx-muted">
          <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
          <span>Your private reference for tracking — not a public profile.</span>
        </div>
      </div>
    </article>
  );
}
