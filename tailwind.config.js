
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: 'hsl(222, 47%, 11%)', // Dark blue, almost black
        'links-background': 'hsl(222, 47%, 15%)',
        foreground: 'hsl(210, 40%, 98%)', // Almost white
        
        card: 'hsl(222, 47%, 15%)',
        'card-foreground': 'hsl(210, 40%, 98%)',

        popover: 'hsl(222, 47%, 15%)',
        'popover-foreground': 'hsl(210, 40%, 98%)',

        primary: 'hsl(210, 40%, 98%)',
        'primary-foreground': 'hsl(217, 39%, 11%)',

        secondary: 'hsl(217, 39%, 25%)',
        'secondary-foreground': 'hsl(210, 40%, 98%)',

        muted: 'hsl(217, 39%, 25%)',
        'muted-foreground': 'hsl(215, 20%, 65%)',

        accent: 'hsl(217, 39%, 40%)',
        'accent-foreground': 'hsl(210, 40%, 98%)',

        destructive: 'hsl(0, 84%, 60%)',
        'destructive-foreground': 'hsl(210, 40%, 98%)',

        border: 'hsl(217, 39%, 25%)',
        input: 'hsl(217, 39%, 25%)',
        ring: 'hsl(217, 39%, 40%)',
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
