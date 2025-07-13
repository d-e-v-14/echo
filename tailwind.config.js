/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
    extend: {
      fontFamily: {
        poppins: ['var(--font-poppins)', 'sans-serif'],
      },
      backgroundImage: {
        'landing-gradient': 'linear-gradient(160deg,rgba(255, 167, 38, 1) 0%, rgba(168, 160, 160, 1) 21%, rgba(26, 32, 55, 1) 23%, rgba(20, 35, 92, 1) 43%, rgba(16, 37, 122, 1) 48%, rgba(26, 32, 55, 1) 71%, rgba(36, 50, 103, 1) 100%)',
      },
      keyframes: {
        'border-spin': {
          '100%': {
            transform: 'rotate(-360deg)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'border-spin': 'border-spin 3s linear infinite',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins:  [require('tailwind-scrollbar'),
],
} 