import { CalendarCheck, MessageSquare, Sparkles, Compass } from 'lucide-react';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Host reviews your request',
    body: 'Our team shares a quality-checked inquiry with the host — not a blind spam lead.',
  },
  {
    icon: MessageSquare,
    title: 'Discuss availability',
    body: 'If the stay fits, you and the host align on dates and details directly.',
  },
  {
    icon: CalendarCheck,
    title: 'Finalize your stay',
    body: 'Confirm advance and arrangements together — no platform payment step required.',
  },
  {
    icon: Compass,
    title: 'Track updates anytime',
    body: 'Use your Guest ID and email on Track inquiry — no account required today.',
  },
] as const;

type InquirySuccessNextStepsProps = {
  className?: string;
};

export default function InquirySuccessNextSteps({ className = '' }: InquirySuccessNextStepsProps) {
  return (
    <section
      className={`${className}`}
      aria-labelledby="success-next-steps-heading"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
        What happens next
      </p>
      <h3
        id="success-next-steps-heading"
        className="mt-1 text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight"
      >
        Your path to the stay
      </h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <article
              key={step.title}
              className="rounded-2xl p-4 sm:p-5 inquiry-reveal motion-reduce:animate-none"
              style={{
                animationDelay: `${index * 70}ms`,
                background: 'var(--xpx-surface, #fff)',
                border: '1px solid var(--xpx-border)',
                boxShadow: '0 8px 28px rgba(15,23,42,0.04)',
              }}
            >
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'var(--xpx-verified-bg)', color: 'var(--xpx-verified)' }}
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <h4 className="mt-3 text-sm font-bold text-xpx-text leading-snug">{step.title}</h4>
              <p className="mt-1.5 text-xs sm:text-sm text-xpx-muted leading-relaxed">{step.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
