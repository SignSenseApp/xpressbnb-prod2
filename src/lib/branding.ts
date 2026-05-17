/** Primary XpressBnB logo — transparent PNG in `public/main-xpx-logo.png`. */
export const XPRESSBNB_LOGO_PATH = '/main-xpx-logo.png' as const;

export const xpLogoAbsoluteUrl = (origin = 'https://xpressbnb.com') =>
  `${origin}${XPRESSBNB_LOGO_PATH}`;

/** Square logo for Google Search / Open Graph (48×48+ required for favicon in SERP). */
export const XPRESSBNB_SEO_LOGO_PATH = '/favicon-192.png' as const;
export const xpSeoLogoAbsoluteUrl = (origin = 'https://xpressbnb.com') =>
  `${origin}${XPRESSBNB_SEO_LOGO_PATH}`;

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
