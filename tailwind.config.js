/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: { 50: '#fdf9ef', 100: '#f8efd9', 200: '#efe0b8', 300: '#e2c98c' },
        ink: { DEFAULT: '#2b1d12', soft: '#4a3628' },
        blood: { DEFAULT: '#9b1c1c', dark: '#7a1414' },
        moss: { DEFAULT: '#2f6b3a', dark: '#245230' },
        royal: { DEFAULT: '#1f4f8f', dark: '#173d70' },
        gold: { DEFAULT: '#b7791f' },
      },
      fontFamily: {
        display: ['"Georgia"', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
