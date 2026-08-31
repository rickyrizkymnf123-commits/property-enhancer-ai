/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border, 217.2 32.6% 17.5%))",
        input: "hsl(var(--input, 217.2 32.6% 17.5%))",
        ring: "hsl(var(--ring, 263.4 70% 50.4%))",
        background: "hsl(var(--background, 222.2 84% 4.9%))",
        foreground: "hsl(var(--foreground, 210 40% 98%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 263.4 70% 50.4%))",
          foreground: "hsl(var(--primary-foreground, 210 40% 98%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 217.2 32.6% 17.5%))",
          foreground: "hsl(var(--secondary-foreground, 210 40% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 217.2 32.6% 17.5%))",
          foreground: "hsl(var(--muted-foreground, 215 20.2% 65.1%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 217.2 32.6% 17.5%))",
          foreground: "hsl(var(--accent-foreground, 210 40% 98%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 62.8% 30.6%))",
          foreground: "hsl(var(--destructive-foreground, 210 40% 98%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 222.2 84% 4.9%))",
          foreground: "hsl(var(--card-foreground, 210 40% 98%))",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        heading: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
};
