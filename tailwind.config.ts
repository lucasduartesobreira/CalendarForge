import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-500": "#2563eb",
        "primary-400": "#3b82f6",
        "primary-300": "#60a5fa",
        "primary-200": "#93c5fd",
        "primary-100": "#bfdbfe",
        "primary-50": "#dbeafe",
        "neutral-100": "#f5f5f5",
        "neutral-200": "#e5e5e5",
        "neutral-300": "#d4d4d4",
        "neutral-400": "#a3a3a3",
        "neutral-500": "#737373",
        "neutral-600": "#525252",
        "neutral-700": "#404040",
        "neutral-800": "#262626",
        "text-primary": "#0a0a0a",
        "text-inverse": "#eff6ff",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
  safelist: [
    {
      pattern: /col-start-(2|3|4|5|6|7|8)/,
    },
    /*
     *{
     *  pattern:
     *    /row-start-\[(1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24)\]/,
     *},
     */
    {
      pattern: /row-start-([0-9]|1[0-9]|2[0-4])/,
    },
  ],
};
export default config;
