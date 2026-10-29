/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#F0FDF4", 100: "#DCFCE7", 500: "#16A34A", 700: "#15803D", 900: "#14532D" },
        aqua: { 50: "#ECFEFF", 500: "#06B6D4", 700: "#0E7490" },
        canvas: "#F8FAFC",
        ink: "#0F172A",
        muted: "#64748B",
        line: "#E2E8F0",
        warn: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Instrument Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.04), 0 4px 16px -8px rgba(15,23,42,.12)" },
    },
  },
  plugins: [],
};
