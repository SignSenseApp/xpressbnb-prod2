type ContinueAsGuestIdentityProps = {
  guestName: string;
  customerReference: string;
  className?: string;
};

export default function ContinueAsGuestIdentity({
  guestName,
  customerReference,
  className = '',
}: ContinueAsGuestIdentityProps) {
  return (
    <section
      className={`rounded-3xl px-5 py-5 sm:px-6 sm:py-6 text-left inquiry-reveal motion-reduce:animate-none ${className}`}
      style={{
        background: 'linear-gradient(165deg, #f8fafc 0%, #ffffff 60%)',
        border: '1px solid var(--xpx-border)',
        boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
      }}
      aria-label="Continue as guest"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
        Continue as
      </p>
      <p className="mt-1 text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight">
        {guestName.trim() || 'Guest'}
      </p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-xpx-subtle">Guest ID</p>
          <p className="mt-0.5 font-mono text-base sm:text-lg font-bold text-xpx-text tabular-nums">
            {customerReference}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs sm:text-sm text-xpx-muted leading-relaxed">
        Your travel profile was created automatically from your first inquiry. No password yet — no
        friction. This is your identity on XpressBnB, not a login screen.
      </p>
    </section>
  );
}
