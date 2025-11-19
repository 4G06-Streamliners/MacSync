/** @type {import('tailwindcss').Config} */
export default {
  presets: [require('@large-event/web-components/tailwind-preset')],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/@large-event/web-components/dist/**/*.js",
    "../../node_modules/@teamd/web-components/dist/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'teamd-purple': '#8b5cf6',
        'teamd-purple-dark': '#7c3aed',
        'teamd-teal': '#17a2b8',
        'teamd-teal-dark': '#117a8b',
        'warning-yellow': '#856404',
        'warning-bg': '#fff3cd',
        'info-blue': '#0c5460',
        'info-bg': '#d1ecf1',
        'error-red': '#dc2626',
        'error-bg': '#fef2f2',
        'text-gray': '#6b7280',
        'bg-gray-light': '#f3f4f6',
        'bg-gray-lighter': '#f9fafb',
        'footer-dark': '#1f2937',
      },
      boxShadow: {
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}
