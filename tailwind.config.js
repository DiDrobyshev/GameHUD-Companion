/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        overlay: {
          base: 'rgba(15, 17, 23, 0.90)',
          card: 'rgba(24, 27, 36, 0.85)',
          border: 'rgba(255, 255, 255, 0.12)',
        }
      }
    },
  },
  plugins: [],
}