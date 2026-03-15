/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e1a',
        card: '#111827',
        border: '#1e293b',
        accent: '#f59e0b',
        green: '#00e676',
        red: '#ff5252',
      },
    },
  },
  plugins: [],
};
