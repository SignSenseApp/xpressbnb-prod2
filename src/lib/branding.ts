/**
 * Primary in-app logo — 144px PNG generated from `public/main-xpx-logo.png`
 * by scripts/generate-favicon.mjs (max render 48px CSS × 3x DPR).
 */
export const XPRESSBNB_LOGO_PATH = '/logo-144.png' as const;

/**
 * Icon size tracks the wordmark: set font-size on the flex row that wraps
 * `<img>` + text (e.g. `text-base md:text-xl`), then apply this class to the image.
 * ~1.22em keeps the mark slightly taller than the cap height — normal for nav marks.
 */
export const XPRESSBNB_LOGO_IMG_CLASS =
  'h-[1.22em] w-[1.22em] object-contain shrink-0 align-middle' as const;

/** Primary nav / sticky headers — larger mark so it reads next to the wordmark */
export const XPRESSBNB_LOGO_NAV_IMG_CLASS =
  'h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 object-contain shrink-0 align-middle' as const;

export const DPIIT_RECOGNIZED_BADGE_PATH =
  '/images/institutional/dpiit-recognized-startup-badge.png' as const;

export const IIT_ROORKEE_ECOSYSTEM_BADGE_PATH =
  '/images/institutional/iit-roorkee-ecosystem-badge.png' as const;

/** Emblem-only PNGs (transparent background) for homepage credibility strip */
export const DPIIT_EMBLEM_PATH = '/images/institutional/dpiit-emblem.png' as const;

export const IIT_ROORKEE_EMBLEM_PATH =
  '/images/institutional/iit-roorkee-emblem.png' as const;
