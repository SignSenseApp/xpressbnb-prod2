/**
 * XpressBnB design tokens — single source of truth for the light Gen Z
 * aesthetic. Warm off-white surfaces, almost-black ink, the same warm
 * orange brand accent for continuity, and a soft lavender accent2 for
 * pills / playful highlights.
 *
 * Use these from JSX inline styles when you need exact values, or use the
 * `bg-xpx-*` / `text-xpx-*` Tailwind utilities defined in tailwind.config.js
 * for the same values inside class lists.
 */

export const theme = {
  // Surfaces — graded from warm off-white page → pure white card → cream
  // hovers. Easier on the eyes than #FFFFFF as a page bg.
  base: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceLight: '#F5F2EC',
  surfaceElevated: '#EEE9DF',

  // Lines & dividers — almost-black at very low alpha so they read as
  // light hairlines, never as heavy borders.
  border: 'rgba(15,23,42,0.08)',
  borderStrong: 'rgba(15,23,42,0.12)',

  // Ink — almost-black for high contrast on the warm off-white base.
  text: '#0F172A',
  textMuted: 'rgba(15,23,42,0.62)',
  textSubtle: 'rgba(15,23,42,0.42)',

  // Brand warm accent — kept exactly as before so the orange CTAs and
  // wordmark accent feel consistent with the dark version of the brand.
  warm: '#F4A261',
  warmDark: '#E08C45',
  warmGlow: 'rgba(244,162,97,0.25)',

  // Secondary playful accent — soft lavender. Use sparingly for offer
  // chips, pills, hover highlights. Pair only with `warm`, never compete.
  accent2: '#A78BFA',
  accent2Soft: 'rgba(167,139,250,0.14)',

  // Status colors — kept readable on light surfaces.
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
} as const;

/** Pre-baked CSS strings for common shadow / glass effects. */
export const fx = {
  // Soft long-throw shadows — feel like floating cards, not heavy boxes.
  cardShadow: '0 12px 40px rgba(15,23,42,0.06)',
  hoverShadow: '0 20px 56px rgba(15,23,42,0.10)',
  // Frosted-white glass for sticky headers / floating bars.
  glassBg: 'rgba(255,255,255,0.72)',
  glassBgStrong: 'rgba(255,255,255,0.88)',
  glassBlur: 'blur(20px) saturate(1.6)',
} as const;

/**
 * Composable inline-style helper for elevated light cards.
 * Example: <div style={surfaceCard()}>...</div>
 */
export function surfaceCard(elevated = false) {
  return {
    background: elevated ? theme.surfaceLight : theme.surface,
    border: `1px solid ${theme.border}`,
    boxShadow: fx.cardShadow,
  } as const;
}
