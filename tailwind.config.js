/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        paper: "oklch(0.985 0.004 85)",
        "paper-soft": "oklch(0.975 0.005 85)",
        ink: {
          50: "oklch(0.97 0.005 270)",
          100: "oklch(0.94 0.006 270)",
          200: "oklch(0.89 0.007 270)",
          300: "oklch(0.80 0.008 270)",
          400: "oklch(0.65 0.010 270)",
          500: "oklch(0.50 0.012 270)",
          700: "oklch(0.32 0.014 270)",
          800: "oklch(0.22 0.014 270)",
          900: "oklch(0.16 0.014 270)",
        },
        accent: {
          50: "oklch(0.96 0.04 155)",
          500: "oklch(0.58 0.13 155)",
          700: "oklch(0.46 0.12 155)",
        },
      },
    },
  },
  plugins: [],
};
