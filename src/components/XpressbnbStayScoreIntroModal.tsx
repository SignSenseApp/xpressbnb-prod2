import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Camera, Wifi, BadgeCheck, MapPin } from 'lucide-react';
import {
  markStayScoreIntroSeen,
  subscribeStayScoreIntroOpen,
} from '../lib/stayScoreIntro';
import { STAY_SCORE_MICROCOPY } from '../lib/xpressbnbStayScore';
import StayScoreModalHero from './stayScore/StayScoreModalHero';
import StayScoreCardChip from './stayScore/StayScoreCardChip';

const SIGNAL_PILLS = [
  { icon: Camera, label: 'Listing photos' },
  { icon: Wifi, label: 'Declared amenities' },
  { icon: ShieldCheck, label: 'Host verification' },
  { icon: MapPin, label: 'Location & capacity' },
  { icon: BadgeCheck, label: 'Homestay & B&B norms' },
] as const;

export default function XpressbnbStayScoreIntroModal() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeStayScoreIntroOpen((next) => {
      setOpen(next);
    });
  }, []);

  const dismiss = useCallback(() => {
    markStayScoreIntroSeen();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close Stay Score intro"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[8px]"
        onClick={dismiss}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stay-score-intro-title"
        className="relative w-full sm:max-w-[420px] max-h-[94dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] sm:rounded-[28px] shadow-[0_28px_90px_rgba(15,23,42,0.2)]"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
        }}
      >
        <div
          className="sm:hidden w-10 h-1 rounded-full absolute left-1/2 -translate-x-1/2 top-3 z-30"
          style={{ background: 'rgba(15,23,42,0.15)' }}
          aria-hidden
        />

        <StayScoreModalHero />

        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(15,23,42,0.08)',
            color: '#64748B',
            boxShadow: '0 4px 14px rgba(15,23,42,0.08)',
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pb-5 sm:px-7 sm:pb-7 -mt-2 relative">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: '#2563EB' }}
          >
            XpressBNB · Listing quality
          </p>
          <h2
            id="stay-score-intro-title"
            className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-xpx-text leading-tight"
          >
            Meet the Stay Score
          </h2>

          <p className="mt-2 text-sm sm:text-[15px] text-xpx-muted leading-relaxed">
            A editorial-style quality signal —{' '}
            <span className="font-semibold text-xpx-text">not guest reviews</span>, not scraped
            from Airbnb or Google. Same listing data → same score, every time.
          </p>

          <div
            className="mt-5 rounded-2xl p-4 sm:p-5"
            style={{
              background: '#F8FAFC',
              border: '1px solid var(--xpx-border)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-xpx-subtle">
              Lives on every card
            </p>
            <div className="mt-3">
              <StayScoreCardChip score={4.6} layout="inline" showInfo={false} />
            </div>
            <p className="mt-3 text-xs sm:text-sm text-xpx-muted leading-relaxed">
              {STAY_SCORE_MICROCOPY}. Amenities hosts declare — aligned with homestay &amp; B&amp;B
              norms in India (safe access, ID checks, water, power, cleanliness).
            </p>
          </div>

          <ul className="mt-5 flex flex-wrap gap-2">
            {SIGNAL_PILLS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-xpx-text"
                style={{
                  background: 'var(--xpx-surface-light)',
                  border: '1px solid var(--xpx-border)',
                }}
              >
                <Icon className="w-3.5 h-3.5 text-xpx-subtle shrink-0" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[11px] sm:text-xs text-xpx-subtle leading-relaxed">
            Ops-verified Airbnb / Google ratings still show separately when we have them. Stay Score
            helps you scan listings fast before you book direct with the host.
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] motion-reduce:transform-none"
            style={{
              background: 'var(--xpx-cta, #059669)',
              boxShadow: '0 12px 32px rgba(5,150,105,0.28)',
            }}
          >
            Got it — show me stays
          </button>

          <p className="mt-2 text-center text-[10px] text-xpx-subtle">
            Shown once. Tap (i) on any card to reopen.
          </p>
        </div>
      </div>
    </div>
  );
}
