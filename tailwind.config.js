/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: "#25D366",
          darkGreen: "#075E54",
          lightGreen: "#DCF8C6",
          teal: "#128C7E",
          bg: "#E5DDD5",
          blue: "#34B7F1",
          gray: "#F0F0F0",
        }
      },
      fontFamily: {
        sans: ["'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
}
