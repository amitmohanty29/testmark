/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          green: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#006c51', // Exact dfpd.gov.in primary green
            700: '#005842',
            800: '#044332',
            900: '#022c22',
            950: '#011c16',
          },
          sand: {
            50: '#fbfaf6', // dfpd.gov.in off-white background
            100: '#f7f5ee',
            200: '#eee9dd',
            300: '#ded7c5',
            400: '#c8beaa',
            500: '#a89c84',
            600: '#7a705c',
            700: '#5c5445',
            800: '#3d372d',
            900: '#231f18',
          },
          saffron: {
            500: '#ff8800',
            600: '#e56a00',
            700: '#c85000',
          },
          gold: {
            500: '#c59b27',
            600: '#a37b12',
          },
          navy: {
            800: '#0f2942',
            900: '#081a2c',
          },
        },
      },
      fontFamily: {
        serif: ['"Noto Serif"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Poppins', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'gov': '0 1px 3px 0 rgba(0, 44, 34, 0.08), 0 1px 2px 0 rgba(0, 44, 34, 0.04)',
        'gov-card': '0 4px 6px -1px rgba(0, 44, 34, 0.07), 0 2px 4px -1px rgba(0, 44, 34, 0.04)',
        'gov-lg': '0 10px 15px -3px rgba(0, 44, 34, 0.1), 0 4px 6px -2px rgba(0, 44, 34, 0.05)',
      },
    },
  },
  plugins: [],
}
