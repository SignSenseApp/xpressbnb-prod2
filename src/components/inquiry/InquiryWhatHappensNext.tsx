import { ClipboardCheck, Home, MessageCircle, Search } from 'lucide-react';

const STEPS = [
  {
    icon: ClipboardCheck,
    title: 'Ops reviews your inquiry',
    body: 'Our team checks your dates and details privately. Your phone and email stay with XpressBnB until the review is complete.',
  },
  {
    icon: Home,
    title: 'Host receives your request',
    body: 'After review, the host sees your inquiry in their dashboard — not a blind spam lead.',
  },
  {
    icon: MessageCircle,
    title: 'Host contacts you directly',
    body: 'If the stay fits, the host reaches out on phone or WhatsApp. You confirm advance and details together — no platform payment step.',
  },
  {
    icon: Search,
    title: 'Track with your Guest ID',
    body: 'Use your Guest ID and email on Track inquiry anytime. No account required.',
  },
] as const;

type InquiryWhatHappensNextProps = {
  className?: string;
};

/** Post-submit education — premium, factual, no invented timelines. */
export default function InquiryWhatHappensNext({ className = '' }: InquiryWhatHappensNextProps) {
  return (
    <section
      className={`rounded-2xl p-4 sm:p-5 text-left ${className}`}
      style={{
        background: 'linear-gradient(165deg, #f0fdf4 0%, #ffffff 48%)',
        border: '1px solid rgba(5,150,105,0.22)',
        boxShadow: '0 10px 32px rgba(5,150,105,0.06)',
      }}
      aria-labelledby="inquiry-next-steps-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800">
        What happens next
      </p>
      <h4
        id="inquiry-next-steps-heading"
        className="mt-1 text-base sm:text-lg font-extrabold text-xpx-text tracking-tight"
      >
        Your inquiry is on its way
      </h4>
      <ol className="mt-4 space-y-3.5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums"
                style={{
                  background: 'var(--xpx-verified-bg)',
                  color: 'var(--xpx-verified)',
                  border: '1px solid rgba(5,150,105,0.15)',
                }}
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-xpx-text leading-snug">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-xpx-muted leading-relaxed">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
