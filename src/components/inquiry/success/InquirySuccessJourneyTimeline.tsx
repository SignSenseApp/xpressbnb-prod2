import { Check } from 'lucide-react';

type JourneyStep = {
  id: string;
  label: string;
  state: 'done' | 'active' | 'upcoming';
};

const SUCCESS_JOURNEY: Array<{ id: string; label: string }> = [
  { id: 'submitted', label: 'Inquiry submitted' },
  { id: 'shared', label: 'Shared with host' },
  { id: 'conversation', label: 'Conversation started' },
  { id: 'confirmed', label: 'Stay confirmed' },
  { id: 'completed', label: 'Trip completed' },
];

type InquirySuccessJourneyTimelineProps = {
  className?: string;
};

/** Post-submit guest journey — first two steps complete, third active. */
export default function InquirySuccessJourneyTimeline({
  className = '',
}: InquirySuccessJourneyTimelineProps) {
  const steps: JourneyStep[] = SUCCESS_JOURNEY.map((step, index) => ({
    ...step,
    state: index <= 1 ? 'done' : index === 2 ? 'active' : 'upcoming',
  }));

  return (
    <ol
      className={`space-y-0 text-left ${className}`}
      aria-label="Your inquiry journey"
    >
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-3 inquiry-reveal motion-reduce:animate-none" style={{ animationDelay: `${index * 60}ms` }}>
          <div className="flex flex-col items-center">
            <StepDot state={step.state} />
            {index < steps.length - 1 && (
              <span
                className={`w-0.5 flex-1 min-h-[1.35rem] my-1 rounded-full ${
                  step.state === 'done' ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            )}
          </div>
          <div className={`pb-5 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
            <p
              className={`text-sm font-semibold leading-snug ${
                step.state === 'upcoming'
                  ? 'text-slate-400'
                  : step.state === 'active'
                    ? 'text-xpx-text'
                    : 'text-emerald-800'
              }`}
            >
              {step.label}
            </p>
            {step.state === 'active' && (
              <p className="text-xs text-xpx-muted mt-0.5 leading-relaxed">
                Waiting for host response after review.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepDot({ state }: { state: JourneyStep['state'] }) {
  if (state === 'done') {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-white"
        aria-hidden
      >
        <span className="h-2 w-2 rounded-full bg-emerald-600" />
      </span>
    );
  }
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white"
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-slate-200" />
    </span>
  );
}
