import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import {
  RISHIKESH_PRIVATE_SOLO_B2B,
  type RishikeshPrivateSoloB2bContent,
} from '../config/rishikeshPrivateSoloB2b';
import { buildTeamWhatsAppLink } from '../lib/team';

export interface RishikeshPrivateSoloB2bCardProps {
  /** Defaults to shared Rishikesh config; override for tests or future CMS payload. */
  content?: RishikeshPrivateSoloB2bContent;
}

/**
 * Calm contextual strip: duration × price matrix + single WhatsApp enquiry.
 * Rishikesh-only usage; styling matches page rhythm (no promo-banner weight).
 */
const RishikeshPrivateSoloB2bCard: React.FC<RishikeshPrivateSoloB2bCardProps> = ({
  content = RISHIKESH_PRIVATE_SOLO_B2B,
}) => {
  const waHref = buildTeamWhatsAppLink(content.whatsappPrefill);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative border-t border-b"
      style={{
        borderColor: 'var(--xpx-border)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, var(--xpx-base) 100%)',
      }}
      aria-labelledby="rishikesh-b2b-solo-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <p
          className="text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase"
          style={{ color: 'var(--xpx-warm-dark)' }}
        >
          {content.eyebrow}
        </p>
        <h2
          id="rishikesh-b2b-solo-heading"
          className="mt-2 text-lg sm:text-xl font-semibold text-xpx-text tracking-tight"
        >
          {content.title}
        </h2>
        <p className="mt-1 text-sm text-xpx-muted max-w-2xl">{content.subtitle}</p>
        {content.routingNote ? (
          <p className="mt-2 text-xs text-xpx-muted max-w-2xl">{content.routingNote}</p>
        ) : null}

        <div
          className="mt-6 overflow-hidden rounded-2xl border bg-white/70"
          style={{ borderColor: 'var(--xpx-border)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-[220px] lg:min-h-[300px]">
              <img
                src={content.heroImageUrl}
                alt={content.heroImageAlt}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.52) 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">Private event format</p>
                <p className="mt-2 text-lg sm:text-xl font-semibold text-white leading-snug">
                  Curated live solo performances with clear B2B slabs.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              <table className="w-full text-sm border-collapse">
                <caption className="sr-only">Private solo show B2B rates by duration</caption>
                <thead>
                  <tr
                    className="text-left border-b"
                    style={{ borderColor: 'var(--xpx-border)', background: 'var(--xpx-surface)' }}
                  >
                    <th scope="col" className="py-3 px-4 font-medium text-xpx-muted">
                      Duration
                    </th>
                    <th scope="col" className="py-3 px-4 font-medium text-xpx-muted text-right">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {content.tiers.map((tier) => (
                    <tr
                      key={tier.durationMinutes}
                      className="border-b last:border-b-0"
                      style={{ borderColor: 'var(--xpx-border)' }}
                    >
                      <td className="py-3 px-4 text-xpx-text">{tier.durationLabel}</td>
                      <td className="py-3 px-4 text-right font-semibold text-xpx-text tabular-nums">
                        ₹{tier.priceInr.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-xpx-muted max-w-xl">{content.footnote}</p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-full text-sm font-medium transition-colors shrink-0 border text-xpx-text hover:bg-slate-50"
            style={{ borderColor: 'var(--xpx-border-strong)' }}
          >
            <MessageCircle className="w-4 h-4 text-xpx-muted" aria-hidden />
            Book on WhatsApp
          </a>
        </div>
      </div>
    </motion.section>
  );
};

export default RishikeshPrivateSoloB2bCard;
