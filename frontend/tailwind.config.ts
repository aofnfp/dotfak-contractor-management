import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        secondary: '#1E293B',
        cta: '#22C55E',
        background: '#020617',
        text: '#F8FAFC',
        border: '#1E293B',
        input: '#1E293B',
        ring: '#22C55E',
        foreground: '#F8FAFC',
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E2C97E',
          dark: '#8B7332',
        },
        muted: {
          DEFAULT: '#1E293B',
          foreground: '#A8B5CC', // Updated for WCAG AA compliance (4.5:1 contrast ratio)
        },
        popover: {
          DEFAULT: '#283548',
          foreground: '#F8FAFC',
        },
        card: {
          DEFAULT: '#1E293B',
          foreground: '#F8FAFC',
        },
        accent: {
          DEFAULT: '#22C55E',
          foreground: '#F8FAFC',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#F8FAFC',
        },
      },
      fontFamily: {
        heading: ['Cinzel', 'serif'],
        display: ['Cormorant Garamond', 'serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
