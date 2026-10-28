import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17251D",
        forest: "#1B4332",
        lime: "#B7D96B",
        cream: "#F5F8F4",
        rust: "#A4472F",
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
