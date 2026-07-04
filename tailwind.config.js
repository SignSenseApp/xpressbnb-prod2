/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        foreground: '#0F172A',
        primary: '#059669',
        xpx: {
          base: '#FAFAF8',
          surface: '#FFFFFF',
          'surface-light': '#F8FAFC',
          'surface-elevated': '#F8FAFC',
          slate: '#0F172A',
          navy: '#0F172A',
          warm: '#059669',
          'warm-dark': '#047857',
          cta: '#059669',
          'cta-dark': '#047857',
          verified: '#059669',
          'verified-bg': '#ECFDF5',
          trust: '#2563EB',
          'trust-bg': '#EFF6FF',
          rating: '#059669',
          'rating-bg': '#ECFDF5',
          accent2: '#A78BFA',
          'accent2-soft': 'rgba(167,139,250,0.14)',
          text: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
          border: '#E5E7EB',
          'border-strong': '#D1D5DB',
        },
      },
      boxShadow: {
        'xpx-card':
          '0 1px 2px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.06)',
        'xpx-hover': '0 8px 24px rgba(15,23,42,0.10)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'apple-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      minHeight: {
        'screen-svh': '100svh',
        'screen-dvh': '100dvh',
      },
      height: {
        'screen-svh': '100svh',
        'screen-dvh': '100dvh',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-up': 'sheet-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
