import { Check } from 'lucide-react';

type JourneyStep = {
  id: string;
  label: string;
  state: 'done' | 'active' | 'upcoming';
};

const MEMBER_JOURNEY: Array<{ id: string; label: string }> = [
  { id: 'received', label: 'Inquiry received' },
  { id: 'ops', label: 'Ops reviewing details' },
  { id: 'notified', label: 'Host notified' },
  { id: 'contact', label: 'Host contacts you' },
  { id: 'confirmed', label: 'Stay confirmed' },
  { id: 'travel', label: 'Travel begins' },
];

type GuestMemberTimelineProps = {
  className?: string;
};

/** Post-inquiry journey — inquiry received done, ops review active. */
export default function GuestMemberTimeline({ className = '' }: GuestMemberTimelineProps) {
  const steps: JourneyStep[] = MEMBER_JOURNEY.map((step, index) => ({
    ...step,
    state: index === 0 ? 'done' : index === 1 ? 'active' : 'upcoming',
  }));

  return (
    <section className={className} aria-labelledby="guest-journey-heading">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
        What happens next
      </p>
      <h3
        id="guest-journey-heading"
        className="mt-1 text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight"
      >
        Your inquiry journey
      </h3>

      <ol className="mt-6 space-y-0" aria-label="Inquiry journey timeline">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="flex gap-3 inquiry-reveal motion-reduce:animate-none"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col items-center">
              <StepDot state={step.state} />
              {index < steps.length - 1 && (
                <span
                  className={`w-0.5 flex-1 min-h-[1.35rem] my-1 rounded-full ${
                    step.state === 'done' ? 'bg-[var(--accent)]' : 'bg-[var(--xpx-border)]'
                  }`}
                  aria-hidden
                />
              )}
            </div>
            <div className={`pb-5 min-w-0 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
              <p
                className={`text-sm font-semibold leading-snug ${
                  step.state === 'upcoming'
                    ? 'text-xpx-subtle'
                    : step.state === 'active'
                      ? 'text-xpx-text'
                      : 'text-[var(--accent-dark)]'
                }`}
              >
                {step.state === 'done' && (
                  <span className="sr-only">Completed: </span>
                )}
                {step.state === 'active' && (
                  <span className="sr-only">Current step: </span>
                )}
                {step.label}
              </p>
              {step.state === 'active' && (
                <p className="text-xs text-xpx-muted mt-0.5 leading-relaxed">
                  Our team is reviewing your request before the host is notified.
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepDot({ state }: { state: JourneyStep['state'] }) {
  if (state === 'done') {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: 'var(--accent)' }}
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white"
        style={{ borderColor: 'var(--accent)' }}
        aria-hidden
      >
        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
      </span>
    );
  }
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white"
      style={{ borderColor: 'var(--xpx-border)' }}
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-[var(--xpx-border)]" />
    </span>
  );
}
