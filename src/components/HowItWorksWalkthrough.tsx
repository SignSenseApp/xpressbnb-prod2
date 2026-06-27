const STEPS = [
  {
    step: '1',
    title: 'Explore direct stays',
    body: 'Browse real listings with transparent host pricing. No account needed to look around.',
    image: '/images/trust/how-it-works-explore.jpg',
    width: 800,
    height: 500,
  },
  {
    step: '2',
    title: 'Send one secure inquiry',
    body: 'Share your dates and a short note. We review it privately before the host sees your details.',
    image: '/images/trust/how-it-works-inquiry.jpg',
    width: 800,
    height: 500,
  },
  {
    step: '3',
    title: 'Receive direct host confirmation',
    body: 'If the stay fits, the host responds directly. You choose how to pay — no platform commission.',
    image: '/images/trust/how-it-works-confirm.jpg',
    width: 800,
    height: 500,
  },
] as const;

type HowItWorksWalkthroughProps = {
  id?: string;
};

/**
 * Premium three-step product education — not marketing slides.
 */
export default function HowItWorksWalkthrough({ id = 'how-it-works' }: HowItWorksWalkthroughProps) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {STEPS.map((item) => (
          <article
            key={item.step}
            className="flex flex-col overflow-hidden rounded-[22px] border bg-white"
            style={{ borderColor: '#E5E7EB', boxShadow: '0 8px 28px rgba(15,23,42,0.05)' }}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={item.image}
                alt=""
                width={item.width}
                height={item.height}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Step {item.step}
              </p>
              <h3 className="mt-2 text-lg font-extrabold tracking-tight text-xpx-text leading-snug">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-xpx-muted leading-relaxed">{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
