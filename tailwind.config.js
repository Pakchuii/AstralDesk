/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          cyan: '#38bdf8',
          pink: '#f43f5e',
          gold: '#f59e0b',
          purple: '#a855f7',
          emerald: '#10b981',
          bg: '#090d16',
          card: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(56, 189, 248, 0.25)',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'halo-spin': 'haloSpin 10s linear infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        haloSpin: {
          '0%': { transform: 'rotateX(65deg) rotateZ(0deg)' },
          '100%': { transform: 'rotateX(65deg) rotateZ(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
