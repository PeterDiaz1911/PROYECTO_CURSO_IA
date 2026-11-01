import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--text-primary)",
        forest: "var(--forest)",
        lime: "var(--accent-soft)",
        cream: "var(--app-bg)",
        app: "var(--app-bg)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        field: "var(--field-bg)",
        menu: "var(--menu-bg)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        default: "var(--border)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        focus: "var(--focus)",
        "chart-grid": "var(--chart-grid)",
        "chart-axis": "var(--chart-axis)",
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
