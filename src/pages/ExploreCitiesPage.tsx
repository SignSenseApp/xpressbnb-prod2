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
      className="group xpx-card xpx-card-interactive relative w-full overflow-hidden rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <img
          src={city.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-active:scale-[1.02]"
          loading={index < 2 ? 'eager' : 'lazy'}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 via-emerald-950/15 to-transparent"
          aria-hidden
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-xpx-verified-bg px-2.5 py-1 text-[10px] font-semibold tracking-wide text-emerald-800 shadow-sm ring-1 ring-emerald-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live
        </span>
        <span
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-900/25 transition-transform group-active:scale-95"
          aria-hidden
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
        </span>
      </div>

      <div className="border-t border-xpx-border bg-xpx-surface px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-[22px] font-semibold tracking-tight text-xpx-text leading-none">
          {city.name}
        </h2>
        <p className="mt-2 text-[15px] leading-snug text-xpx-muted line-clamp-2">{city.tagline}</p>
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
      className="flex w-full items-center gap-3 rounded-xl border border-xpx-border bg-xpx-surface px-3 py-3 text-left transition-colors active:bg-emerald-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
        <img src={city.image} alt="" className="h-full w-full object-cover opacity-45 grayscale" loading="lazy" />
        <span className="absolute inset-0 flex items-center justify-center bg-emerald-50/50">
          <Lock className="h-4 w-4 text-emerald-600/70" strokeWidth={2} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-xpx-text">{city.name}</p>
        <p className="mt-0.5 text-[13px] font-medium text-emerald-700/80">Coming soon</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-emerald-300" />
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
    <div className="xpx-page pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <SEOHead
        config={{
          title: 'Explore Cities — Delhi NCR, Rishikesh & More | XpressBnB',
          description:
            'Pick your city — verified stays in Delhi, Gurgaon, Noida, Greater Noida and Rishikesh.',
          canonical: 'https://xpressbnb.com/explore',
        }}
      />

      <header className="sticky top-0 z-20 xpx-glass border-b border-xpx-border pt-safe">
        <div className="xpx-container flex h-14 items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-emerald-800 active:opacity-70"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            Back
          </button>
          <img
            src={XPRESSBNB_LOGO_PATH}
            alt=""
            className={`${XPRESSBNB_LOGO_IMG_CLASS} h-8 w-8 object-contain`}
            width={32}
            height={32}
          />
        </div>
      </header>

      <section className="xpx-container pt-8 pb-6">
        <h1 className="text-[34px] font-semibold tracking-tight text-xpx-text leading-[1.1]">
          Where to next?
        </h1>
        <p className="mt-3 max-w-[32ch] text-[17px] leading-relaxed text-xpx-muted">
          Verified stays across India —{' '}
          <span className="font-medium text-emerald-700">no brokerage</span>.
        </p>
      </section>

      <section className="xpx-container pb-10">
        <p className="xpx-eyebrow mb-4">Book now</p>
        <div className="flex flex-col gap-5">
          {LIVE_EXPLORE_CITIES.map((city, i) => (
            <LiveCityCard key={city.id} city={city} index={i} onSelect={() => goCity(city)} />
          ))}
        </div>
      </section>

      <section className="xpx-container pb-8">
        <p className="xpx-eyebrow mb-4">Coming soon</p>
        <div className="flex flex-col gap-2">
          {COMING_SOON_EXPLORE_CITIES.map(city => (
            <ComingSoonRow key={city.id} city={city} onTap={() => setNotifyCity(city.name)} />
          ))}
        </div>

        {notifyCity && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-4 py-4 text-white shadow-lg shadow-emerald-900/20"
          >
            <p className="text-[14px] leading-relaxed text-emerald-50/95">
              <span className="font-semibold text-white">{notifyCity}</span> is on our list. Email{' '}
              <a
                href="mailto:support@xpressbnb.com"
                className="font-medium text-emerald-200 underline underline-offset-2"
              >
                support@xpressbnb.com
              </a>{' '}
              for early access.
            </p>
            <button
              type="button"
              onClick={() => setNotifyCity(null)}
              className="mt-3 text-[13px] font-medium text-emerald-200/80"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </section>
    </div>
  );
}
