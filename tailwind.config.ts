import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        forest: "#184c42",
        lime: "#b6dc66",
        cream: "#f4f1e7",
        rust: "#c9603f",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        sans: ["var(--font-manrope)"],
      },
    },
  },
  plugins: [],
};

export default config;
