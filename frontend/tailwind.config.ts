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
        primary: {
          DEFAULT: '#5B21B6',
          light: '#8B5CF6',
          dark: '#3B0764',
          50: '#F5F3FF',
          100: '#DDD6FE',
          500: '#6D28D9',
          600: '#5B21B6',
          700: '#4C1D95',
          800: '#3B0764',
          900: '#2E1065',
        },
        accent: {
          DEFAULT: '#C9A24B',
          light: '#DEC17A',
          dark: '#A68233',
          50: '#FCF9F1',
          100: '#F7F0DC',
          500: '#C9A24B',
          600: '#B28E3A',
        },
        surface: {
          DEFAULT: '#F7F8FA',
          card: '#FFFFFF',
          border: '#E5E7EB',
          subtle: '#EEF0F4',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        status: {
          success: '#2E9E5B',
          'success-bg': '#EAF7EE',
          warning: '#D97706',
          'warning-bg': '#FEF3C7',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          info: '#2563EB',
          'info-bg': '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        gold: '0 0 15px rgba(201, 162, 75, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
