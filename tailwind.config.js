/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--color-primary))',
        accent: 'hsl(var(--color-accent))',
        danger: 'hsl(var(--color-danger))',
        bg: 'hsl(var(--color-bg))',
        surface: 'hsl(var(--color-surface))',
        'surface-hover': 'hsl(var(--color-surface-hover))',
        text: 'hsl(var(--color-text))',
        'text-muted': 'hsl(var(--color-text-muted))',
        border: 'hsl(var(--color-border))',
        heads: 'hsl(var(--color-heads))',
        tails: 'hsl(var(--color-tails))',
        jackpot: 'hsl(var(--color-jackpot))',
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'card': '0 8px 24px hsla(240, 10%, 0%, 0.4)',
        'glow': '0 0 32px hsla(266, 100%, 60%, 0.3)',
        'jackpot-glow': '0 0 48px hsla(45, 93%, 47%, 0.5)',
      },
      animation: {
        'pulse-jackpot': 'pulse-jackpot 2s ease-in-out infinite',
        'slide-in': 'slide-in var(--duration-base) var(--easing)',
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
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'base': 'var(--duration-base)',
        'slow': 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'custom': 'var(--easing)',
      },
    },
  },
  plugins: [],
}