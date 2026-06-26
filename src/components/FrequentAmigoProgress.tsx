import { Sparkles } from 'lucide-react';

export type FrequentAmigoDisplay = {
  qualifyingCount: number;
  threshold: number;
  unlocked: boolean;
};

type FrequentAmigoProgressProps = {
  status: FrequentAmigoDisplay;
};

export default function FrequentAmigoProgress({ status }: FrequentAmigoProgressProps) {
  const threshold = status.threshold > 0 ? status.threshold : 3;
  const displayCount = Math.min(Math.max(0, status.qualifyingCount), threshold);

  if (displayCount < 1) return null;

  if (status.unlocked) {
    return (
      <section
        className="rounded-2xl p-4 text-left"
        aria-labelledby="frequent-amigo-unlocked"
        style={{
          background: 'linear-gradient(135deg, rgba(5,150,105,0.06) 0%, #ffffff 100%)',
          border: '1px solid rgba(5,150,105,0.18)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(5,150,105,0.12)' }}
            aria-hidden
          >
            <Sparkles className="h-4 w-4 text-emerald-700" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h4
              id="frequent-amigo-unlocked"
              className="text-sm font-bold tracking-tight text-xpx-text"
            >
              Frequent Amigo ✦
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-xpx-muted">
              You&apos;ve made 3 verified stay requests recently. We&apos;ll make your next stay
              faster.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-xpx-subtle">
              Your inquiry is already with the host.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl px-4 py-3 text-left"
      aria-labelledby="frequent-amigo-progress"
      style={{
        background: 'var(--xpx-surface-light)',
        border: '1px solid var(--xpx-border)',
      }}
    >
      <p id="frequent-amigo-progress" className="text-xs font-semibold text-xpx-muted">
        Building your XpressBNB travel profile
      </p>
      <p className="mt-0.5 text-sm font-medium text-xpx-text">
        {displayCount} of {threshold} verified stay requests
      </p>
    </section>
  );
}
