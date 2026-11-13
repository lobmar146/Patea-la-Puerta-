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
        gold: { DEFAULT: '#e39a2d', dark: '#c47f17' },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
          inset: 'rgb(var(--surface-inset) / <alpha-value>)',
        },
        ui: {
          fg: 'rgb(var(--ui-fg) / <alpha-value>)',
          muted: 'rgb(var(--ui-muted) / <alpha-value>)',
          line: 'rgb(var(--ui-line) / <alpha-value>)',
          control: 'rgb(var(--ui-control) / <alpha-value>)',
        },
        accent: {
          wine: 'rgb(var(--accent-wine) / <alpha-value>)',
          moss: 'rgb(var(--accent-moss) / <alpha-value>)',
          gold: 'rgb(var(--accent-gold) / <alpha-value>)',
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          brand: 'rgb(var(--accent-brand) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
