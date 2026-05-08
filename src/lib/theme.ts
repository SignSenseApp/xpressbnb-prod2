/**
 * Brand accent — emerald (`#50C878`, Canva “Emerald green”) for UI links, chips, brand mark.
 * `cta` stays coral for property booking CTAs only (Reserve / Book Now) where used explicitly.
 */

export const theme = {
  base: '#FFFFFF',
  surfaceLight: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',

  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  /** Brand accent (navbar, chips, labels, icons) */
  accent: '#50C878',
  accentDark: '#3dae68',
  accentLight: '#ecfdf5',
  accentBorder: '#bbf7d0',

  /** Conversion CTAs only */
  cta: '#FF385C',
  ctaDark: '#E11D48',

  /** @deprecated prefer `accent` — kept for gradual migration */
  warm: '#50C878',
  warmDark: '#3dae68',
  warmGlow: 'rgba(80,200,120,0.22)',

  slate: '#0F172A',
  navy: '#0F172A',

  verified: '#50C878',
  verifiedBg: '#ecfdf5',

  trust: '#2563EB',
  trustBg: '#EFF6FF',

  rating: '#D97706',
  ratingBg: '#FFFBEB',

  /** @deprecated use `accent` — kept for any legacy reference */
  mint: '#50C878',

  accent2: '#A78BFA',
  accent2Soft: 'rgba(167,139,250,0.14)',

  success: '#50C878',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
} as const;

export const fx = {
  cardShadow:
    '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.08)',
  hoverShadow: '0 8px 32px rgba(15,23,42,0.14)',
  glassBg: 'rgba(255,255,255,0.72)',
  glassBgStrong: 'rgba(255,255,255,0.88)',
  glassBlur: 'blur(20px) saturate(1.6)',
} as const;

export function surfaceCard(elevated = false) {
  return {
    background: elevated ? theme.surfaceLight : theme.surface,
    border: `1px solid ${theme.border}`,
    boxShadow: fx.cardShadow,
  } as const;
}
