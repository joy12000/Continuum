
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: '#121212',
        'surface-2': '#1E1E1E',
        'text-primary': '#E0E0E0',
        'text-secondary': '#B0B0B0',
        accent: '#1E90FF',
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
  plugins: [],
}
