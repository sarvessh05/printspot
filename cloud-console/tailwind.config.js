/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0c0c0e',
        surface: '#16161a',
        primary: '#3b82f6',
        secondary: '#10b981',
        danger: '#ef4444',
      }
    },
  },
  plugins: [],
}
