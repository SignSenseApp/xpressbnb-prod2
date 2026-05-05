import React from 'react';
import { ArrowRight } from 'lucide-react';
import { RISHIKESH_EXPERIENCES } from '../config/rishikeshExperiences';
import { buildTeamWhatsAppLink } from '../lib/team';

const VIEW_ALL_EXPERIENCES_PREFILL =
  'Hi — I want to see all experiences available in Rishikesh (rafting, yoga, treks, food trails, etc). Please share full details and pricing.';

const buildExperienceEnquiry = (title: string) =>
  `Hi — I want to book the "${title}" experience in Rishikesh. Please share availability and pricing.`;

const RishikeshExperiencesSection: React.FC = () => {
  const viewAllUrl = buildTeamWhatsAppLink(VIEW_ALL_EXPERIENCES_PREFILL);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 sm:mt-16 mb-16 sm:mb-20">
      <div className="flex items-end justify-between mb-5">
        <h2 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight">
          Experiences in Rishikesh
        </h2>
        <a
          href={viewAllUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold hover:underline min-h-[36px] px-1"
          style={{ color: 'var(--xpx-warm-dark)' }}
        >
          View all experiences
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {RISHIKESH_EXPERIENCES.map((e) => (
          <a
            key={e.id}
            href={buildTeamWhatsAppLink(buildExperienceEnquiry(e.title))}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl overflow-hidden bg-white block transition-shadow duration-300 shadow-[0_6px_22px_rgba(15,23,42,0.05)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)] hover:-translate-y-0.5"
            style={{ border: '1px solid var(--xpx-border)' }}
            aria-label={`Book ${e.title} on WhatsApp`}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={e.imageUrl}
                alt={e.imageAlt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className="p-3.5 sm:p-4">
              <p className="text-sm font-bold text-xpx-text leading-snug">{e.title}</p>
              <p className="mt-1 text-xs text-xpx-muted leading-relaxed">{e.subtitle}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default RishikeshExperiencesSection;
