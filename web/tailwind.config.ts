/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "hsl(var(--ink) / <alpha-value>)",
        paper: "hsl(var(--paper) / <alpha-value>)",
        mint: "hsl(var(--mint) / <alpha-value>)",
        "mint-soft": "hsl(var(--mint-soft) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        secondary: "hsl(var(--secondary) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        reverse: "hsl(var(--reverse) / <alpha-value>)",
        pop: "hsl(var(--pop) / <alpha-value>)",
        scroll: "hsl(var(--scroll))",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
