/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/src/**/*.{ts,tsx}', './client/index.html'],
  theme: {
    extend: {
      colors: {
        delta: {
          green: '#00FF7F',
          navy: '#0a0e1a',
          card: '#111827',
          border: '#1f2937',
        },
      },
    },
  },
  plugins: [],
};
