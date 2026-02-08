/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#7A1F3E',
          dark: '#621832',
        },
        gold: {
          DEFAULT: '#D4A843',
        },
      },
    },
  },
  plugins: [],
};
