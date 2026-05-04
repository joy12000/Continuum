/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        'bg-alt': '#f9fafb',
        surface: '#f2f4f6',
        'surface-2': '#e8f3ff',
        foreground: '#191f28',
        'secondary-text': '#333d4b',
        muted: '#6b7684',
        'dim-text': '#8b95a1',
        card: '#ffffff',
        'card-foreground': '#191f28',
        primary: '#3182f6',
        'primary-hover': '#1b64da',
        'primary-deep': '#1e40af',
        'primary-soft': '#e8f3ff',
        secondary: '#e8f3ff',
        'secondary-foreground': '#1b64da',
        destructive: '#f04452',
        'destructive-foreground': '#ffffff',
        border: '#e5e8eb',
        'border-strong': '#d1d6db',
        input: '#f2f4f6',
        ring: '#3182f6',
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
