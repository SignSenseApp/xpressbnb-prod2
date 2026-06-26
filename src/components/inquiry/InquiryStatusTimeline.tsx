import { Check, Circle } from 'lucide-react';
import type { InquiryTrackStatus } from '../../lib/inquirySubmit';

export type TimelineStep = {
  id: string;
  label: string;
  state: 'done' | 'active' | 'upcoming';
};

function mapTrackStatusToSteps(displayStatus: InquiryTrackStatus): TimelineStep[] {
  const order: Array<{ id: string; label: string }> = [
    { id: 'received', label: 'Inquiry received' },
    { id: 'review', label: 'Quality review in progress' },
    { id: 'sent', label: 'Sent to host' },
    { id: 'viewed', label: 'Host reviewing' },
  ];

  const activeIndex = (() => {
    if (displayStatus === 'cancelled') return -1;
    switch (displayStatus) {
      case 'preparing':
        return 1;
      case 'sent_to_host':
        return 2;
      case 'viewed_by_host':
      case 'host_responded':
        return 3;
      case 'completed':
        return 3;
      default:
        return 1;
    }
  })();

  return order.map((step, index) => ({
    id: step.id,
    label: displayStatus === 'cancelled' && index === order.length - 1
      ? 'Inquiry closed'
      : step.label,
    state:
      displayStatus === 'cancelled'
        ? ('upcoming' as const)
        : index < activeIndex
          ? ('done' as const)
          : index === activeIndex
            ? ('active' as const)
            : ('upcoming' as const),
  }));
}

type InquiryStatusTimelineProps = {
  displayStatus?: InquiryTrackStatus;
  /** Immediate post-submit: first two steps light up */
  variant?: 'submit' | 'track';
  className?: string;
};

export default function InquiryStatusTimeline({
  displayStatus = 'preparing',
  variant = 'submit',
  className = '',
}: InquiryStatusTimelineProps) {
  const steps =
    variant === 'submit'
      ? [
          { id: 'received', label: 'Inquiry received', state: 'done' as const },
          { id: 'review', label: 'Quality review in progress', state: 'active' as const },
          { id: 'sent', label: 'Sent to host', state: 'upcoming' as const },
          { id: 'viewed', label: 'Host reviewing', state: 'upcoming' as const },
        ]
      : mapTrackStatusToSteps(displayStatus);

  return (
    <ol
      className={`space-y-0 text-left ${className}`}
      aria-label="Inquiry progress"
    >
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon state={step.state} />
            {index < steps.length - 1 && (
              <span
                className={`w-0.5 flex-1 min-h-[1.25rem] my-1 rounded-full ${
                  step.state === 'done' ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            )}
          </div>
          <div className={`pb-4 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
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
            {step.state === 'active' && variant === 'submit' && (
              <p className="text-xs text-xpx-muted mt-0.5 leading-relaxed">
                We&apos;re preparing your inquiry before sending it to the host.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ state }: { state: TimelineStep['state'] }) {
  if (state === 'done') {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
        aria-hidden
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-emerald-600 bg-white"
        aria-hidden
      >
        <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse motion-reduce:animate-none" />
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300"
      aria-hidden
    >
      <Circle className="h-3 w-3" />
    </span>
  );
}
