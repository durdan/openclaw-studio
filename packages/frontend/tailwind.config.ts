import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: 'rgb(var(--studio-bg) / <alpha-value>)',
          surface: 'rgb(var(--studio-surface) / <alpha-value>)',
          border: 'rgb(var(--studio-border) / <alpha-value>)',
          accent: 'rgb(var(--studio-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--studio-accent-hover) / <alpha-value>)',
          text: 'rgb(var(--studio-text) / <alpha-value>)',
          'text-muted': 'rgb(var(--studio-text-muted) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
