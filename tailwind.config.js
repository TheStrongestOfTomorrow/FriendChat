/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4052b6",
        "primary-container": "#8899ff",
        secondary: "#006571",
        "secondary-container": "#26e6ff",
        surface: "#f5f6f7",
        "surface-container-low": "#eff1f2",
        "surface-container-high": "#e6e8ea",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#2c2f30",
        "on-surface-variant": "#595c5d",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        'lg': '1rem',
        'md': '0.75rem',
        'sm': '0.25rem',
      }
    },
  },
  plugins: [],
}
