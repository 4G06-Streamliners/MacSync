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
        'teamd-purple': '#6f42c1',
        'teamd-purple-hover': '#5a35a0',
        'gray': {
          50: '#f8f9fa',
          100: '#f5f5f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#333333',
        },
        'blue': {
          400: '#17a2b8',
          500: '#007bff',
          600: '#0066cc',
        },
        'success': '#28a745',
        // Flattened error colors
        'error-light': '#fee',
        'error': '#dc3545',
        'error-border': '#fcc',
        'error-text': '#c33',
        'error-bg': '#fef2f2',
        'error-red': '#dc2626',
        // Flattened warning colors
        'warning-light': '#fff3cd',
        'warning': '#ffc107',
        'warning-text': '#856404',
        'warning-yellow': '#856404',
        'warning-bg': '#fff3cd',
        'warning-border': '#ffc107',
        // Info colors
        'info-blue': '#0c5460',
        'info-bg': '#d1ecf1',
      },
      boxShadow: {
        'card-hover': '0 8px 16px rgba(111, 66, 193, 0.15)',
        'form': '0 2px 10px rgba(0, 0, 0, 0.1)',
      },
      maxWidth: {
        'dashboard': '1200px',
        'card': '300px',
        'form': '600px',
      },
      transitionProperty: {
        'card': 'all',
      },
    },
  },
  plugins: [],
}
