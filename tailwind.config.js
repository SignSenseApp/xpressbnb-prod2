/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        foreground: '#0F172A',
        primary: '#50C878',
        xpx: {
          base: '#FFFFFF',
          surface: '#FFFFFF',
          'surface-light': '#F8FAFC',
          'surface-elevated': '#F1F5F9',
          slate: '#0F172A',
          navy: '#0F172A',
          warm: '#50C878',
          'warm-dark': '#3dae68',
          cta: '#FF385C',
          'cta-dark': '#E11D48',
          verified: '#50C878',
          'verified-bg': '#ECFDF5',
          trust: '#2563EB',
          'trust-bg': '#EFF6FF',
          rating: '#D97706',
          'rating-bg': '#FFFBEB',
          accent2: '#A78BFA',
          'accent2-soft': 'rgba(167,139,250,0.14)',
          text: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
          border: '#E2E8F0',
          'border-strong': '#CBD5E1',
        },
      },
      boxShadow: {
        'xpx-card':
          '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.08)',
        'xpx-hover': '0 8px 32px rgba(15,23,42,0.14)',
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
