import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f0f',
        foreground: '#ffffff',
        card: { DEFAULT: '#1a1a1a', foreground: '#ffffff' },
        border: '#27272a',
        muted: { DEFAULT: '#27272a', foreground: '#a1a1aa' },
        accent: { DEFAULT: '#27272a', foreground: '#ffffff' },
        primary: { DEFAULT: '#6366f1', foreground: '#ffffff' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
