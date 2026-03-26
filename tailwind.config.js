/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/src/**/*.{ts,tsx}', './client/index.html'],
  theme: {
    extend: {
      colors: {
        delta: {
          green: '#00E676',
          bg: '#F5F6FA',
          card: '#FFFFFF',
          border: '#E8EBF0',
          navy: '#0B0021',
          text: '#1A1D26',
          muted: '#6B7280',
          subtle: '#F0F2F7',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        soft: '0 2px 8px rgba(0,0,0,0.04)',
        glow: '0 0 20px rgba(0,230,118,0.15)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
