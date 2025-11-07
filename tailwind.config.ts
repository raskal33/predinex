import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        main: "var(--font-onest)",
      },
      colors: {
        // BSC/Binance Brand Colors
        bsc: {
          yellow: "#FFC107",    // Binance Yellow - Primary
          gold: "#F7B600",      // Gold accent
          blue: "#1F3A5F",      // Deep Blue
          dark: "#0F1419",      // Dark Navy
          light: "#FFFFFF",     // Light
        },
        // Prediction Market Colors
        market: {
          rise: "#10B981",      // Emerald Green - Bullish
          fall: "#EF4444",      // Red - Bearish
          neutral: "#8B5CF6",   // Purple - Balanced
          hot: "#FF6B6B",       // Coral - Hot markets
        },
        // Dark Theme Design System
        bg: {
          main: "#0F1419",          // Main background
          card: "rgba(31, 41, 55, 0.5)",  // Card background with glassmorphism
          overlay: "rgba(0, 0, 0, 0.6)",      // Modal/overlay background
        },
        border: {
          card: "rgba(255, 193, 7, 0.08)",  // Card borders
          input: "rgba(255, 193, 7, 0.12)",  // Input borders
        },
        text: {
          primary: "#FFFFFF",       // Primary text (headers)
          secondary: "#E5E7EB",     // Body text
          muted: "#9CA3AF",        // Muted text
          accent: "#FFC107",       // Accent text (Yellow)
        },
        // Semantic colors using BSC + Market palette
        primary: "#FFC107",     // BSC Yellow as primary
        secondary: "#10B981",   // Market Rise/Green as secondary
        accent: "#8B5CF6",      // Market Neutral as accent
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        // Legacy colors (keeping for backward compatibility)
        dark: {
          1: "#161616",
          2: "#222222",
          3: "#333333",
        },
        light: {
          1: "#fefefe",
        },
        disabled: {
          1: "#d1d1d1",
        },
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(135deg, #0F1419 0%, #1F2937 50%, #111827 100%)',
        'gradient-bsc': 'linear-gradient(135deg, #FFC107 0%, #F7B600 50%, #FFD54F 100%)',
        'gradient-primary': 'linear-gradient(135deg, #FFC107 0%, #FFD54F 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-market': 'linear-gradient(135deg, #FFC107 0%, #10B981 50%, #8B5CF6 100%)',
        'gradient-text': 'linear-gradient(135deg, #FFC107 0%, #10B981 100%)',
      },
      boxShadow: {
        'glow-yellow': '0 0 20px rgba(255, 193, 7, 0.25)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.25)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.25)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 12px 40px rgba(255, 193, 7, 0.15)',
        'button': '0 4px 16px rgba(255, 193, 7, 0.25)',
        'button-hover': '0 8px 24px rgba(255, 193, 7, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
        'card': '8px',
        'modal': '16px',
      },
      animation: {
        'gradient-flow': 'gradient-flow 4s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'color-cycle': 'color-cycle 8s linear infinite',
        'logo-cycle': 'logo-cycle 6s ease-in-out infinite',
        'market-pulse': 'market-pulse 2s ease-in-out infinite',
      },
              keyframes: {
          'logo-cycle': {
            '0%': { 
              filter: 'brightness(1) saturate(1)',
              transform: 'scale(1)'
            },
            '50%': { 
              filter: 'brightness(1.1) saturate(1.1)',
              transform: 'scale(1.02)'
            },
            '100%': { 
              filter: 'brightness(1) saturate(1)',
              transform: 'scale(1)'
            },
          },
          'color-cycle': {
            '0%': { filter: 'hue-rotate(0deg)' },
            '100%': { filter: 'hue-rotate(360deg)' },
          },
          'market-pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(255, 193, 7, 0.7)' },
            '70%': { boxShadow: '0 0 0 10px rgba(255, 193, 7, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(255, 193, 7, 0)' },
          },
        'gradient-flow': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(34, 199, 255, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(34, 199, 255, 0.6)' 
          }
        },
        'shimmer': {
          '0%': {
            backgroundPosition: '-1000px 0'
          },
          '100%': {
            backgroundPosition: '1000px 0'
          }
        },
        'somnia-color-cycle': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '20%': { filter: 'hue-rotate(72deg)' }, // To Violet
          '40%': { filter: 'hue-rotate(144deg)' }, // To Magenta
          '60%': { filter: 'hue-rotate(216deg)' }, // To Cyan
          '80%': { filter: 'hue-rotate(288deg)' }, // To Blue
          '100%': { filter: 'hue-rotate(360deg)' },
        },
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
