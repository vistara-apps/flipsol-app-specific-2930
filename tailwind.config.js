/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(266, 100%, 60%)',
        accent: 'hsl(142, 76%, 36%)',
        danger: 'hsl(0, 84%, 60%)',
        bg: 'hsl(240, 10%, 4%)',
        surface: 'hsl(240, 6%, 10%)',
        'surface-hover': 'hsl(240, 6%, 14%)',
        text: 'hsl(0, 0%, 98%)',
        'text-muted': 'hsl(240, 5%, 64%)',
        border: 'hsl(240, 6%, 18%)',
        heads: 'hsl(211, 100%, 50%)',
        tails: 'hsl(25, 95%, 53%)',
        jackpot: 'hsl(45, 93%, 47%)',
      },
      boxShadow: {
        'card': '0 8px 24px hsla(240, 10%, 0%, 0.4)',
        'glow': '0 0 32px hsla(266, 100%, 60%, 0.3)',
        'jackpot-glow': '0 0 48px hsla(45, 93%, 47%, 0.5)',
      },
      animation: {
        'pulse-jackpot': 'pulse-jackpot 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'confetti': 'confetti 1s ease-out',
      },
      keyframes: {
        'pulse-jackpot': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'confetti': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}