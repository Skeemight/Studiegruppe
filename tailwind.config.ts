import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F7F5F0',
          dark: '#F0EDE7',
        },
        warm: {
          border: '#E8E4DD',
          'border-hover': '#D4CFC7',
          text: '#6B6560',
          muted: '#9C9590',
        },
        terra: {
          DEFAULT: '#C45D3E',
          hover: '#A94E34',
          light: '#F5E8E4',
        },
        sage: {
          DEFAULT: '#2B6B5E',
          light: '#E4F0EC',
        },
        ink: '#1A1A1A',
        warmError: '#BB4444',
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
      },
      transitionDuration: {
        fast: '120ms',
        normal: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
