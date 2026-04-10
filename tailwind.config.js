/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00FF41", // Matrix Green
        "primary-dark": "#008F11",
        secondary: "#003B00",
        surface: "#0D0208", // Almost black
        "surface-light": "#003B00",
        "on-surface": "#00FF41",
        "on-surface-dim": "#008F11",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
