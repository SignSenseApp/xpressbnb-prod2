import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  Compass,
  Lock,
  MapPin,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
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

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

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
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      onClick={onSelect}
      className="group relative w-full text-left overflow-hidden rounded-[22px] min-h-[200px] sm:min-h-[220px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      style={{
        boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
      }}
    >
      <img
        src={city.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 group-active:scale-[1.02]"
        loading={index < 2 ? 'eager' : 'lazy'}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(3,46,37,0.15) 0%, rgba(3,46,37,0.35) 40%, rgba(3,46,37,0.92) 100%)',
        }}
      />
      <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live now
      </span>
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200/90">{city.vibe}</p>
        <h2 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-white">{city.name}</h2>
        <p className="mt-1 text-sm text-white/85 leading-snug">{city.tagline}</p>
        <p className="mt-2 text-xs font-medium text-emerald-100/90">{city.hook}</p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#032E25] shadow-lg transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]">
          Explore stays
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </motion.button>
  );
}

function ComingSoonCard({ city, index }: { city: ExploreCity; index: number }) {
  return (
    <motion.div
      custom={index + 10}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-[20px] min-h-[140px] border border-dashed border-slate-300 bg-slate-50"
    >
      <img
        src={city.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[2px] scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-slate-900/20" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          <Lock className="h-3 w-3" />
          Coming soon
        </span>
        <div>
          <h3 className="text-lg font-extrabold text-white">{city.name}</h3>
          <p className="text-xs text-white/75 mt-0.5">{city.tagline}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function ExploreCitiesPage({ onNavigate }: ExploreCitiesPageProps) {
  const [notifyCity, setNotifyCity] = useState<string | null>(null);

  const goCity = (city: ExploreCity) => {
    if (city.status !== 'live') return;
    onNavigate(cityStaysPath(city));
  };

  return (
    <div className="xpx-page min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <SEOHead
        config={{
          title: 'Explore Cities — Delhi NCR, Rishikesh & More | XpressBnB',
          description:
            'Pick your city — verified stays in Delhi, Gurgaon, Noida, Greater Noida and Rishikesh. More Indian cities launching soon on XpressBnB.',
          canonical: 'https://xpressbnb.com/explore',
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#032E25] text-white">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(80,200,120,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 0% 100%, rgba(5,150,105,0.25), transparent 50%)',
          }}
        />
        <div className="xpx-container relative pt-safe">
          <div className="flex items-center justify-between py-4">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-white/15 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </button>
            <img
              src={XPRESSBNB_LOGO_PATH}
              alt=""
              className={`${XPRESSBNB_LOGO_IMG_CLASS} h-9 w-9 object-contain`}
              width={36}
              height={36}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pb-8 pt-2 sm:pb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
              <Compass className="h-3.5 w-3.5" />
              Explore India
            </div>
            <h1 className="mt-4 text-[32px] sm:text-[40px] font-extrabold leading-[1.08] tracking-tight max-w-[16ch]">
              Kahan jaana hai?
              <span className="block text-emerald-300">Choose your city.</span>
            </h1>
            <p className="mt-4 text-base text-white/80 max-w-md leading-relaxed">
              Verified stays, zero brokerage — pick Delhi NCR or Rishikesh today. More cities are
              unlocking soon.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {[
                { icon: Shield, label: 'Couple-safe options' },
                { icon: Zap, label: 'Hourly & full-day' },
                { icon: CheckCircle2, label: 'Host-verified' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90"
                >
                  <Icon className="h-3.5 w-3.5 text-emerald-300" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live cities */}
      <section className="xpx-container xpx-section-tight">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="xpx-eyebrow">Book today</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">
              Live destinations
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
            {LIVE_EXPLORE_CITIES.length} cities
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {LIVE_EXPLORE_CITIES.map((city, i) => (
            <LiveCityCard key={city.id} city={city} index={i} onSelect={() => goCity(city)} />
          ))}
        </div>
      </section>

      {/* Coming soon */}
      <section className="xpx-container pb-10">
        <div className="rounded-[24px] border border-xpx-border bg-gradient-to-br from-slate-50 to-emerald-50/40 p-5 sm:p-7">
          <motion.div className="flex items-start gap-3 mb-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-xpx-text tracking-tight">
                Expanding across India
              </h2>
              <p className="mt-1 text-sm text-xpx-muted leading-relaxed">
                Mumbai, Goa, Bengaluru & more — tap a city to get notified when we launch.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {COMING_SOON_EXPLORE_CITIES.map((city, i) => (
              <button
                key={city.id}
                type="button"
                onClick={() => setNotifyCity(city.name)}
                className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-[20px]"
              >
                <ComingSoonCard city={city} index={i} />
              </button>
            ))}
          </div>

          {notifyCity && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-[#032E25] px-5 py-4 text-white"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-emerald-300 shrink-0" />
                <p className="text-sm">
                  <strong>{notifyCity}</strong> — we&apos;ll prioritise this city. Email us at{' '}
                  <a href="mailto:support@xpressbnb.com" className="text-emerald-300 underline">
                    support@xpressbnb.com
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifyCity(null)}
                className="shrink-0 text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-xpx-muted flex items-center justify-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          Delhi NCR · Uttarakhand · pan-India rollout 2026
        </p>
      </section>
    </div>
  );
}
