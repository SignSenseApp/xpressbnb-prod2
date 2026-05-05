/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#FAFAF7',
        foreground: '#0F172A',
        primary: '#F4A261',
        // XpressBnB light Gen Z theme — match constants in src/lib/theme.ts
        xpx: {
          base: '#FAFAF7',
          surface: '#FFFFFF',
          'surface-light': '#F5F2EC',
          'surface-elevated': '#EEE9DF',
          warm: '#F4A261',
          'warm-dark': '#E08C45',
          // Secondary playful accent — soft lavender. Pair only with warm.
          accent2: '#A78BFA',
          'accent2-soft': 'rgba(167,139,250,0.14)',
          text: '#0F172A',
          muted: 'rgba(15,23,42,0.62)',
          subtle: 'rgba(15,23,42,0.42)',
          border: 'rgba(15,23,42,0.08)',
          'border-strong': 'rgba(15,23,42,0.12)',
        },
      },
      // Apple-grade spring easings. Use as e.g. `transition-[transform] ease-spring`.
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'apple-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      // Modern viewport units that respect mobile browser chrome (URL bar resize).
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
