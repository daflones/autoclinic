/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        numeric: ['Manrope', 'Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#C265A3", // Velvet Rose
          50: "#FCEFF7",
          100: "#F8E1EF",
          200: "#F1C4E0",
          300: "#EAA6D1",
          400: "#E189C1",
          500: "#C265A3",
          600: "#A15486",
          700: "#814469",
          800: "#61334D",
          900: "#412230",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#D8C5FF", // Soft Lilac
          50: "#FBFAFF",
          100: "#F3EEFF",
          200: "#E6DDFF",
          300: "#D8C5FF",
          400: "#BDA0FF",
          500: "#A27AFF",
          600: "#8655FF",
          700: "#6A30F0",
          800: "#4E1EC5",
          900: "#331599",
          foreground: "#1B1B1F",
        },
        tertiary: {
          DEFAULT: "#F5E8F0", // Champagne Glow
          200: "#F8EEF3",
          300: "#F0DDE7",
          400: "#E7CDDB",
        },
        neutral: {
          DEFAULT: "#1B1B1F", // Graphite
          50: "#F7F4FB",
          100: "#EAE6F2",
          200: "#DCD5E5",
          400: "#A095B7",
          600: "#5B536F",
          800: "#322C3F",
        },
        success: {
          DEFAULT: "#3BAA84",
          light: "#57C49D",
          dark: "#2F8869",
        },
        error: {
          DEFAULT: "#E86E6E",
          light: "#F18A8A",
          dark: "#C75959",
        },
        warning: {
          DEFAULT: "#F6B27A",
          light: "#F8C49A",
          dark: "#D99156",
        },
        info: {
          DEFAULT: "#6A9BEF",
          light: "#8AB4F5",
          dark: "#4A7BD0",
        },
        pending: {
          DEFAULT: "#F09FAD",
          light: "#F6BAC4",
          dark: "#D17987",
        },
        destructive: {
          DEFAULT: "#E86E6E",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "rgba(247, 244, 251, 0.65)",
          foreground: "#5B536F",
        },
        accent: {
          DEFAULT: "rgba(210, 180, 255, 0.7)",
          foreground: "#1B1B1F",
        },
        popover: {
          DEFAULT: "rgba(50, 30, 59, 0.92)",
          foreground: "#F5E8F0",
        },
        card: {
          DEFAULT: "rgba(255, 255, 255, 0.8)",
          foreground: "#1B1B1F",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
