import {
  DPIIT_EMBLEM_PATH,
  IIT_ROORKEE_EMBLEM_PATH,
} from '../lib/branding';

const TEXT = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER = '#E5E7EB';

function InstitutionalMark({
  emblemSrc,
  eyebrow,
  title,
  alt,
}: {
  emblemSrc: string;
  eyebrow: string;
  title: string;
  alt: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 sm:gap-3 min-w-0 flex-1 max-w-[min(100%,18rem)]">
      <img
        src={emblemSrc}
        alt={alt}
        className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] md:h-20 md:w-20 lg:h-24 lg:w-24 object-contain object-center"
        width={96}
        height={96}
        loading="lazy"
        decoding="async"
      />
      <div className="space-y-0.5">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: TEXT_MUTED }}
        >
          {eyebrow}
        </p>
        <p
          className="text-xs sm:text-sm md:text-[15px] font-semibold leading-snug"
          style={{ color: TEXT }}
        >
          {title}
        </p>
      </div>
    </div>
  );
}

/**
 * Institutional trust row — emblem-only assets (no pill background) with CSS labels.
 */
export default function InstitutionalCredibilityStrip() {
  return (
    <div
      className="border-t pt-6 md:pt-7 pb-3 md:pb-4"
      style={{ borderColor: BORDER }}
    >
      <div className="flex flex-col items-center gap-4 md:gap-5">
        <p
          className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: TEXT_MUTED }}
        >
          Recognized &amp; supported by
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-6 sm:gap-8 md:gap-12 w-full max-w-4xl px-2">
          <InstitutionalMark
            emblemSrc={DPIIT_EMBLEM_PATH}
            eyebrow="Recognized by"
            title="DPIIT Recognized Startup"
            alt="Government of India — DPIIT Recognized Startup"
          />
          <span
            className="hidden sm:block w-px self-stretch min-h-[5.5rem] shrink-0"
            style={{ background: BORDER }}
            aria-hidden
          />
          <InstitutionalMark
            emblemSrc={IIT_ROORKEE_EMBLEM_PATH}
            eyebrow="Born from"
            title="IIT Roorkee Ecosystem"
            alt="IIT Roorkee"
          />
        </div>
      </div>
    </div>
  );
}
