import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: "#7A1F3E",
          dark: "#621832",
        },
        gold: {
          DEFAULT: "#D4A843",
        },
        "app-gray": "#F5F5F7",
      },
    },
  },
  plugins: [],
} satisfies Config;
