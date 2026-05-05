import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import { RISHIKESH_ARTISTS, type RishikeshArtist } from '../config/rishikeshArtists';
import { buildTeamWhatsAppLink } from '../lib/team';

const EXPLORE_ALL_ARTISTS_PREFILL =
  'Hi — I want to see the full list of artists available for my Rishikesh stay (musicians, yoga instructors, storytellers, etc). Please share the catalog and availability.';

const BookArtistSection: React.FC = () => {
  const exploreAllUrl = buildTeamWhatsAppLink(EXPLORE_ALL_ARTISTS_PREFILL);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 sm:mt-16">
      <div
        className="rounded-3xl p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-[1.1fr_2.4fr] gap-3 sm:gap-5"
        style={{ background: '#FEF3E7' }}
      >
        <div
          className="relative rounded-2xl overflow-hidden p-6 sm:p-7 flex flex-col justify-between min-h-[240px] shadow-[0_8px_28px_rgba(15,23,42,0.06)]"
          style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border)' }}
        >
          <div>
            <p
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em]"
              style={{ color: 'var(--xpx-warm-dark)' }}
            >
              <Sparkles className="w-3.5 h-3.5" /> Featured
            </p>
            <h3 className="mt-3 text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-xpx-text">
              Book a Live Artist
              <br /> for Your Stay
            </h3>
            <p className="mt-2.5 text-sm text-xpx-muted max-w-xs leading-relaxed">
              Add music, yoga or storytelling to elevate your experience.
            </p>
          </div>
          <a
            href={exploreAllUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 self-start inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full text-xs font-bold transition-colors hover:bg-orange-50 active:scale-95"
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--xpx-warm)',
              color: 'var(--xpx-warm-dark)',
            }}
          >
            Explore All Artists
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {RISHIKESH_ARTISTS.map((artist, i) => (
            <ArtistCard key={artist.id} artist={artist} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

function ArtistCard({ artist, index }: { artist: RishikeshArtist; index: number }) {
  const wa = buildTeamWhatsAppLink(artist.whatsappPrefill);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.36, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="group rounded-2xl overflow-hidden flex flex-col shadow-[0_8px_28px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)] transition-shadow duration-300"
      style={{ background: '#FFFFFF', border: '1px solid var(--xpx-border)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={artist.imageUrl}
          alt={artist.imageAlt}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <button
          type="button"
          aria-label={`Save ${artist.title}`}
          className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
          }}
        >
          <Heart className="w-4 h-4 text-slate-700" />
        </button>
      </div>
      <div className="p-4 sm:p-[18px] flex-1 flex flex-col">
        <h4 className="text-[15px] sm:text-base font-bold text-xpx-text leading-snug">
          {artist.title}
        </h4>
        <p className="mt-1 text-xs text-xpx-muted leading-relaxed">{artist.subtitle}</p>
        <div className="mt-auto pt-4 flex items-end justify-between gap-2">
          <p className="text-base font-extrabold text-xpx-text leading-tight">
            ₹{artist.priceInr.toLocaleString('en-IN')}
            <span className="text-xs font-medium text-xpx-muted"> /{artist.durationLabel}</span>
          </p>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-full text-xs font-bold text-white transition-colors active:scale-95 hover:brightness-95"
            style={{
              background: 'var(--xpx-warm)',
              boxShadow: '0 4px 14px rgba(244,162,97,0.36)',
            }}
          >
            Book Now
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default BookArtistSection;
