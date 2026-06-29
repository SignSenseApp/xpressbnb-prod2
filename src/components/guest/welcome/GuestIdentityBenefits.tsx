import { Check } from 'lucide-react';

const BENEFITS = [
  'Track inquiries',
  'Faster future inquiries',
  'Travel history',
  'Support assistance',
  'Future member benefits',
] as const;

type GuestIdentityBenefitsProps = {
  className?: string;
};

export default function GuestIdentityBenefits({ className = '' }: GuestIdentityBenefitsProps) {
  return (
    <section className={className} aria-labelledby="guest-id-benefits-heading">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-xpx-subtle">
        Your Guest ID
      </p>
      <h3
        id="guest-id-benefits-heading"
        className="mt-1 text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight"
      >
        Helps you travel with clarity
      </h3>
      <p className="mt-2 text-sm text-xpx-muted leading-relaxed max-w-prose">
        A calm reference for your stays on XpressBnB — not a login, not a loyalty program.
      </p>

      <ul className="mt-5 space-y-3">
        {BENEFITS.map((benefit, index) => (
          <li
            key={benefit}
            className="flex items-start gap-3 text-sm inquiry-reveal motion-reduce:animate-none"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
              aria-hidden
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="font-medium text-xpx-text">{benefit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
