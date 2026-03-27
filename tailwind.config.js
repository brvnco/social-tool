/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/src/**/*.{ts,tsx}', './client/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        delta: {
          green: 'rgb(var(--delta-accent) / <alpha-value>)',
          bg: 'rgb(var(--delta-bg) / <alpha-value>)',
          card: 'rgb(var(--delta-card) / <alpha-value>)',
          border: 'rgb(var(--delta-border) / <alpha-value>)',
          navy: 'rgb(var(--delta-navy) / <alpha-value>)',
          text: 'rgb(var(--delta-text) / <alpha-value>)',
          muted: 'rgb(var(--delta-muted) / <alpha-value>)',
          subtle: 'rgb(var(--delta-subtle) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        soft: '0 2px 8px rgba(0,0,0,0.04)',
        glow: '0 0 20px rgb(var(--delta-accent) / 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
