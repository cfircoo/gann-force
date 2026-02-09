/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bullish: {
          DEFAULT: "#16a34a",
          light: "#bbf7d0",
        },
        bearish: {
          DEFAULT: "#dc2626",
          light: "#fecaca",
        },
      },
    },
  },
  plugins: [],
};
