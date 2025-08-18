/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  corePlugins: {
    // 禁用 Tailwind 的预设样式，避免与 Ant Design 冲突
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // 红色主题色系 - 法律系产品
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        legal: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #ef4444, 0 0 10px #ef4444, 0 0 15px #ef4444' },
          '100%': { boxShadow: '0 0 10px #ef4444, 0 0 20px #ef4444, 0 0 30px #ef4444' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(1deg)' }
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
    function({ addBase }) {
      addBase({
        // 确保 divide 工具类的边框样式
        '.divide-x > :not(:first-child)': {
          'border-left-width': '1px',
          'border-left-style': 'solid',
        },
        '.divide-y > :not(:first-child)': {
          'border-top-width': '1px',
          'border-top-style': 'solid',
        },
        '.border': {
          'border-width': '1px',
          'border-style': 'solid',
        }
      })
    }
  ],
}
