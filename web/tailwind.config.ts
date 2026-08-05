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
				text: "hsl(var(--text) / <alpha-value>)",
				background: "hsl(var(--background) / <alpha-value>)",
				primary: "hsl(var(--primary) / <alpha-value>)",
				secondary: "hsl(var(--secondary) / <alpha-value>)",
				accent: "hsl(var(--accent) / <alpha-value>)",
				reverse: "hsl(var(--reverse) / <alpha-value>)",
				pop: "hsl(var(--pop) / <alpha-value>)",
				scroll: "hsl(var(--scroll))",		  
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;