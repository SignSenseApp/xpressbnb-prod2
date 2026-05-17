import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react';
import SEOHead from '../components/SEOHead';
import {
  COMING_SOON_EXPLORE_CITIES,
  LIVE_EXPLORE_CITIES,
  cityStaysPath,
  type ExploreCity,
} from '../config/exploreCities';
import { XPRESSBNB_LOGO_IMG_CLASS, XPRESSBNB_LOGO_PATH } from '../lib/branding';

interface ExploreCitiesPageProps {
  onNavigate: (path: string) => void;
}

function LiveCityCard({
  city,
  index,
  onSelect,
}: {
  city: ExploreCity;
  index: number;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={onSelect}
      className="group relative w-full overflow-hidden rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      style={{
        boxShadow: '0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.08)',
      }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <img
          src={city.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-active:scale-[1.02]"
          loading={index < 2 ? 'eager' : 'lazy'}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
          aria-hidden
        />
        <span className="absolute top-3 left-3 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 shadow-sm">
          Live
        </span>
        <span
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-md transition-transform group-active:scale-95"
          aria-hidden
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
        </span>
      </div>

      <div className="bg-white px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 leading-none">
          {city.name}
        </h2>
        <p className="mt-2 text-[15px] leading-snug text-slate-500 line-clamp-2">{city.tagline}</p>
      </div>
    </motion.button>
  );
}

function ComingSoonRow({
  city,
  onTap,
}: {
  city: ExploreCity;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-left transition-colors active:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        <img src={city.image} alt="" className="h-full w-full object-cover opacity-50 grayscale" loading="lazy" />
        <span className="absolute inset-0 flex items-center justify-center bg-white/40">
          <Lock className="h-4 w-4 text-slate-500" strokeWidth={2} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-slate-900">{city.name}</p>
        <p className="text-[13px] text-slate-500 mt-0.5">Coming soon</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}

export default function ExploreCitiesPage({ onNavigate }: ExploreCitiesPageProps) {
  const [notifyCity, setNotifyCity] = useState<string | null>(null);

  const goCity = (city: ExploreCity) => {
    if (city.status !== 'live') return;
    onNavigate(cityStaysPath(city));
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <SEOHead
        config={{
          title: 'Explore Cities — Delhi NCR, Rishikesh & More | XpressBnB',
          description:
            'Pick your city — verified stays in Delhi, Gurgaon, Noida, Greater Noida and Rishikesh.',
          canonical: 'https://xpressbnb.com/explore',
        }}
      />

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#FAFAF8]/90 backdrop-blur-xl pt-safe">
        <div className="xpx-container flex h-14 items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-600 active:opacity-70"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            Back
          </button>
          <img
            src={XPRESSBNB_LOGO_PATH}
            alt=""
            className={`${XPRESSBNB_LOGO_IMG_CLASS} h-8 w-8 object-contain opacity-90`}
            width={32}
            height={32}
          />
        </div>
      </header>

      {/* Hero — light, minimal */}
      <section className="xpx-container pt-8 pb-6">
        <h1 className="text-[34px] font-semibold tracking-tight text-slate-900 leading-[1.1]">
          Where to next?
        </h1>
        <p className="mt-3 max-w-[28ch] text-[17px] leading-relaxed text-slate-500">
          Choose a city. Verified stays, no brokerage.
        </p>
      </section>

      {/* Live */}
      <section className="xpx-container pb-10">
        <p className="mb-4 text-[13px] font-medium uppercase tracking-widest text-slate-400">
          Book now
        </p>
        <div className="flex flex-col gap-5">
          {LIVE_EXPLORE_CITIES.map((city, i) => (
            <LiveCityCard key={city.id} city={city} index={i} onSelect={() => goCity(city)} />
          ))}
        </div>
      </section>

      {/* Coming soon */}
      <section className="xpx-container pb-8">
        <p className="mb-4 text-[13px] font-medium uppercase tracking-widest text-slate-400">
          Coming soon
        </p>
        <div className="flex flex-col gap-2">
          {COMING_SOON_EXPLORE_CITIES.map(city => (
            <ComingSoonRow key={city.id} city={city} onTap={() => setNotifyCity(city.name)} />
          ))}
        </div>

        {notifyCity && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl bg-slate-900 px-4 py-4 text-white"
          >
            <p className="text-[14px] leading-relaxed text-white/90">
              <span className="font-semibold text-white">{notifyCity}</span> is on our list. Email{' '}
              <a href="mailto:support@xpressbnb.com" className="underline text-white">
                support@xpressbnb.com
              </a>{' '}
              to get early access.
            </p>
            <button
              type="button"
              onClick={() => setNotifyCity(null)}
              className="mt-3 text-[13px] font-medium text-white/60"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </section>
    </div>
  );
}
