import preset from "@titoapps/brand/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        navy: "#0F172A",
        teal: { deep: "#134E4A", DEFAULT: "#0E8A8A" },
        mint: "#A7F3D0",
        emerald: { 300: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857" },
        deficit: "#E11D48",
      },
    },
  },
  plugins: [],
};
