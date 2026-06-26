import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';

const HERO_IMAGE = '/images/onboarding/welcome-hero.jpg';
const MOTION_MS = 200;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

type WelcomeOfferModalProps = {
  open: boolean;
  onExplore: () => void;
  onSignIn: () => void;
  onDismiss: () => void;
};

/**
 * Premium brand introduction — not a discount popup.
 * Shown once after cookie + location flow and first listings engagement.
 */
export default function WelcomeOfferModal({
  open,
  onExplore,
  onSignIn,
  onDismiss,
}: WelcomeOfferModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), reducedMotion ? 0 : MOTION_MS + 20);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!mounted) return null;

  const backdropStyle = {
    opacity: visible ? 1 : 0,
    transition: reducedMotion ? 'none' : `opacity ${MOTION_MS}ms ${EASE_OUT}`,
  };

  const panelStyle = {
    opacity: visible ? 1 : 0,
    transform: visible
      ? 'translateY(0) scale(1)'
      : reducedMotion
        ? 'none'
        : 'translateY(12px) scale(0.98)',
    transition: reducedMotion ? 'none' : `opacity ${MOTION_MS}ms ${EASE_OUT}, transform ${MOTION_MS}ms ${EASE_OUT}`,
  };

  return (
    <div
      className="fixed inset-0 z-[98] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close welcome"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[6px]"
        style={backdropStyle}
        onClick={onDismiss}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative z-[1] w-[calc(100%-20px)] sm:w-full sm:max-w-[520px] max-h-[calc(100dvh-20px)] outline-none overflow-hidden rounded-[28px] sm:rounded-[32px]"
        style={{
          ...panelStyle,
          background: 'var(--xpx-surface, #ffffff)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 32px 80px rgba(15, 23, 42, 0.14)',
        }}
      >
        <div className="relative aspect-[16/10] sm:aspect-[5/3] w-full overflow-hidden">
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            width={1040}
            height={624}
            decoding="async"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(15,23,42,0.42) 0%, rgba(15,23,42,0.04) 55%, transparent 100%)',
            }}
            aria-hidden
          />
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm hover:bg-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-6 pb-6 sm:px-8 sm:pt-7 sm:pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-xpx-subtle">
            XpressBnB
          </p>
          <h2
            id={titleId}
            className="mt-2 text-[26px] sm:text-[30px] font-extrabold text-xpx-text tracking-tight leading-[1.12]"
          >
            Welcome to XpressBnB
          </h2>
          <p id={descId} className="mt-3 text-[15px] sm:text-base text-xpx-muted leading-relaxed">
            Discover verified stays and connect directly with hosts.
            <span className="block mt-2">No guest commission. Transparent pricing. Built for effortless travel.</span>
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="flex-1 min-h-[48px] rounded-2xl text-[15px] font-bold text-white transition-opacity duration-150 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: 'var(--xpx-cta, #059669)' }}
            >
              Explore stays
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="flex-1 min-h-[48px] rounded-2xl text-[15px] font-semibold text-xpx-text transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              style={{
                background: 'var(--xpx-surface, #ffffff)',
                border: '1px solid var(--xpx-border-strong, #CBD5E1)',
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
