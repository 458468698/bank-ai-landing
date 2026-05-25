/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bank: {
          50: '#f0f5ff',
          100: '#e0eaff',
          200: '#c2d5ff',
          300: '#94b4ff',
          400: '#6690ff',
          500: '#3b6cff',
          600: '#1e4fef',
          700: '#0d3bc7',
          800: '#0c33a0',
          900: '#0e2d7e',
        }
      }
    },
  },
  plugins: [],
}
