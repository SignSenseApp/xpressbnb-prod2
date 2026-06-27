import { Check } from 'lucide-react';
import {
  resolveGuestTrustStages,
  type GuestTrustStageState,
  type GuestTrustContextInput,
} from '../../lib/guestTrustJourney';

type GuestTrustJourneyProps = {
  context?: GuestTrustContextInput;
  /** Show only reached + next stage (post-inquiry compact mode). */
  compact?: boolean;
  className?: string;
};

function StageRow({ stage }: { stage: GuestTrustStageState }) {
  const muted = !stage.reached && !stage.current;
  return (
    <li
      className={`flex gap-3 py-2.5 ${muted ? 'opacity-45' : ''}`}
      aria-current={stage.current ? 'step' : undefined}
    >
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: stage.reached ? 'var(--xpx-verified)' : 'var(--xpx-border-strong)',
          background: stage.reached ? 'var(--xpx-verified-bg)' : 'var(--xpx-surface)',
        }}
        aria-hidden
      >
        {stage.reached ? (
          <Check className="h-3 w-3" style={{ color: 'var(--xpx-verified)' }} strokeWidth={2.5} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        )}
      </span>
      <div className="min-w-0 text-left">
        <p
          className={`text-sm font-semibold leading-snug ${
            stage.current ? 'text-xpx-text' : 'text-xpx-muted'
          }`}
        >
          {stage.label}
          {stage.current ? (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Now
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-xpx-subtle leading-relaxed">{stage.description}</p>
      </div>
    </li>
  );
}

/** Progressive trust journey — calm, factual, no gamification. */
export default function GuestTrustJourney({
  context,
  compact = false,
  className = '',
}: GuestTrustJourneyProps) {
  const stages = resolveGuestTrustStages(context);
  const visible = compact
    ? (() => {
        const currentIdx = stages.findIndex((s) => s.current);
        const start = Math.max(0, currentIdx - 1);
        return stages.slice(start, Math.min(stages.length, start + 4));
      })()
    : stages;

  return (
    <section
      className={`rounded-2xl p-4 sm:p-5 text-left ${className}`}
      style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)' }}
      aria-labelledby="guest-trust-journey-heading"
    >
      <h4
        id="guest-trust-journey-heading"
        className="text-[11px] font-bold uppercase tracking-[0.14em] text-xpx-subtle"
      >
        Your trust journey
      </h4>
      <p className="mt-1.5 text-xs text-xpx-muted leading-relaxed">
        Trust builds as you use XpressBnB — nothing to verify upfront.
      </p>
      <ol className="mt-3 divide-y divide-slate-100" aria-label="Guest trust stages">
        {visible.map((stage) => (
          <StageRow key={stage.id} stage={stage} />
        ))}
      </ol>
    </section>
  );
}
