
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#f6f7fb',
        'links-background': '#eef2f7',
        foreground: '#0f172a',

        card: '#ffffff',
        'card-foreground': '#0f172a',

        popover: '#ffffff',
        'popover-foreground': '#0f172a',

        primary: '#0f172a',
        'primary-foreground': '#ffffff',

        secondary: '#f1f5f9',
        'secondary-foreground': '#0f172a',

        muted: '#f3f4f6',
        'muted-foreground': '#6b7280',

        accent: '#0ea5e9',
        'accent-foreground': '#ffffff',

        destructive: '#ef4444',
        'destructive-foreground': '#ffffff',

        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#0ea5e9',
      },
      textShadow: {
        glow: '0 0 0.4rem rgba(180,210,255,0.65), 0 0 1.2rem rgba(140,190,255,0.35)',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        zoomIn: { '0%': { transform: 'scale(0.5)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        zoomIn: 'zoomIn 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
