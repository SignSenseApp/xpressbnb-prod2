import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Sparkles, ShieldCheck, Camera, Wifi, BadgeCheck, MapPin } from 'lucide-react';
import {
  markStayScoreIntroSeen,
  subscribeStayScoreIntroOpen,
} from '../lib/stayScoreIntro';
import { STAY_SCORE_MICROCOPY } from '../lib/xpressbnbStayScore';

const SIGNAL_PILLS = [
  { icon: Camera, label: 'Listing photos' },
  { icon: Wifi, label: 'Declared amenities' },
  { icon: ShieldCheck, label: 'Host verification' },
  { icon: MapPin, label: 'Location & capacity' },
  { icon: BadgeCheck, label: 'Homestay & B&B norms' },
] as const;

/**
 * One-time (auto) + on-demand explainer for XpressBNB Stay Score.
 * Not a guest review — listing-quality signal only.
 */
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
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[6px]"
        onClick={dismiss}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stay-score-intro-title"
        className="relative w-full sm:max-w-md max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        style={{
          background: 'var(--xpx-surface)',
          border: '1px solid var(--xpx-border)',
        }}
      >
        <div
          className="sm:hidden w-10 h-1 rounded-full mx-auto mt-3 mb-1"
          style={{ background: 'rgba(15,23,42,0.12)' }}
          aria-hidden
        />

        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full text-xpx-muted hover:text-xpx-text transition-colors"
          style={{
            background: 'rgba(15,23,42,0.05)',
            border: '1px solid var(--xpx-border)',
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-5 pt-6 pb-5 sm:px-7 sm:pt-8 sm:pb-6">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(37,99,235,0.08)',
              color: '#1D4ED8',
              border: '1px solid rgba(37,99,235,0.18)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            New on XpressBNB
          </div>

          <h2
            id="stay-score-intro-title"
            className="mt-4 text-xl sm:text-2xl font-extrabold tracking-tight text-xpx-text leading-tight pr-8"
          >
            Meet the XpressBNB Stay Score
          </h2>

          <p className="mt-2 text-sm sm:text-[15px] text-xpx-muted leading-relaxed">
            A quick listing-quality signal —{' '}
            <span className="font-semibold text-xpx-text">not a guest review</span> and not
            copied from Airbnb or Google. Same data always gives the same score.
          </p>

          <div
            className="mt-5 rounded-2xl p-4 sm:p-5"
            style={{
              background:
                'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(80,200,120,0.06) 100%)',
              border: '1px solid var(--xpx-border)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-xpx-subtle">
              Example on cards
            </p>
            <div
              className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-2 font-bold text-sm text-xpx-text tabular-nums"
              style={{
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.6)',
                boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: 'var(--xpx-trust)' }} />
              <span>4.6</span>
              <span className="text-xs font-semibold text-xpx-muted">Stay Score</span>
            </div>
            <p className="mt-3 text-xs sm:text-sm text-xpx-muted leading-relaxed">
              {STAY_SCORE_MICROCOPY}. We also weigh amenities hosts declare — aligned with
              homestay &amp; B&amp;B guidance hosts follow in India (safe access, ID checks,
              basics like water, power, and cleanliness).
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
            Ops-verified Airbnb / Google ratings still show separately when we have them. Stay
            Score never replaces those — it helps you compare listings at a glance before you
            book direct with the host.
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] motion-reduce:transform-none"
            style={{
              background: 'var(--xpx-cta, #FF385C)',
              boxShadow: '0 12px 32px rgba(255,56,92,0.25)',
            }}
          >
            Got it — show me stays
          </button>

          <p className="mt-2 text-center text-[10px] text-xpx-subtle">
            Shown once automatically. Tap any Stay Score on a card to read this again.
          </p>
        </div>
      </div>
    </div>
  );
}
