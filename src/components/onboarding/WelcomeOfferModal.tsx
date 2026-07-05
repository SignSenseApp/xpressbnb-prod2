import { useEffect, useId, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useGalleryMotion';

const HERO_IMAGE = '/images/onboarding/welcome-hero.jpg';
const MOTION_MS = 200;
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

const TRUST_CHIPS = [
  'No upfront account',
  'Direct host pricing',
  'Privacy-first booking',
] as const;

type WelcomeOfferModalProps = {
  open: boolean;
  onExplore: () => void;
  onHowItWorks: () => void;
  onDismiss: () => void;
};

/**
 * Product education modal — explains browse-first, account-later in under 5 seconds.
 * Shown once after cookie + location flow and first listings engagement.
 */
export default function WelcomeOfferModal({
  open,
  onExplore,
  onHowItWorks,
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

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [open]);

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
        aria-label="Close"
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
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <picture>
            <source
              type="image/webp"
              srcSet={`${HERO_IMAGE.replace('.jpg', '-640.webp')} 640w, ${HERO_IMAGE.replace('.jpg', '.webp')} 1040w`}
              sizes="(min-width: 640px) 560px, 100vw"
            />
            <img
              src={HERO_IMAGE}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              width={1040}
              height={650}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(15,23,42,0.38) 0%, rgba(15,23,42,0.04) 55%, transparent 100%)',
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
          <h2
            id={titleId}
            className="text-[26px] sm:text-[30px] font-extrabold text-xpx-text tracking-tight leading-[1.1]"
          >
            Travel first.
            <span className="block">Create an account later.</span>
          </h2>
          <p id={descId} className="mt-3 text-[15px] sm:text-base text-xpx-muted leading-relaxed">
            Browse direct stays, send your first inquiry, and we&apos;ll issue your private Guest
            ID — no account required. No guest commission.
          </p>

          <ul
            className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2"
            aria-label="Trust highlights"
          >
            {TRUST_CHIPS.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5 text-[13px] text-xpx-muted">
                <Check className="h-3.5 w-3.5 shrink-0 text-xpx-text" strokeWidth={2.5} aria-hidden />
                {chip}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col items-stretch gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="w-full min-h-[48px] rounded-2xl text-[15px] font-bold text-white transition-opacity duration-150 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: 'var(--xpx-cta, #059669)' }}
            >
              Start exploring
            </button>
            <button
              type="button"
              onClick={onHowItWorks}
              className="self-center text-[15px] font-semibold text-xpx-text underline underline-offset-[3px] transition-opacity duration-150 hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
            >
              How it works →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
