/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0B',
        panel: '#111827',
        panel2: '#161f2e',
        gold: { DEFAULT: '#F59E0B', dark: '#D97706', light: '#FBBF24' },
        silver: '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      fontWeight: {
        700: '700',
        800: '800',
      },
    },
  },
  plugins: [],
};
