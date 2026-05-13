/**
 * Brand accent — emerald (`#50C878`, Canva “Emerald green”) for UI links, chips, brand mark.
 * `cta` stays coral for property booking CTAs only (Reserve / Book Now) where used explicitly.
 */

export const theme = {
  base: '#FAFAF8',
  surfaceLight: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',

  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  /** Brand accent (navbar, chips, labels, icons) */
  accent: '#059669',
  accentDark: '#047857',
  accentLight: '#ECFDF5',
  accentBorder: '#A7F3D0',

  /** Conversion CTAs only */
  cta: '#059669',
  ctaDark: '#047857',

  /** @deprecated prefer `accent` — kept for gradual migration */
  warm: '#059669',
  warmDark: '#047857',
  warmGlow: 'rgba(5,150,105,0.20)',

  slate: '#0F172A',
  navy: '#0F172A',

  verified: '#059669',
  verifiedBg: '#ECFDF5',

  trust: '#2563EB',
  trustBg: '#EFF6FF',

  rating: '#059669',
  ratingBg: '#ECFDF5',

  /** @deprecated use `accent` — kept for any legacy reference */
  mint: '#059669',

  accent2: '#A78BFA',
  accent2Soft: 'rgba(167,139,250,0.14)',

  success: '#059669',
  warning: '#64748B',
  danger: '#DC2626',
  info: '#2563EB',
} as const;

export const fx = {
  cardShadow:
    '0 1px 2px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.06)',
  hoverShadow: '0 8px 24px rgba(15,23,42,0.10)',
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
