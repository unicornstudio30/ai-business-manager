import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Material-inspired elevation scale — subtle ambient + crisp directional shadows
      boxShadow: {
        "elevation-0": "none",
        "elevation-1": "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 1px -1px rgb(0 0 0 / 0.04)",
        "elevation-2": "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 2px 6px -2px rgb(0 0 0 / 0.06)",
        "elevation-3": "0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        "elevation-4": "0 8px 16px -4px rgb(0 0 0 / 0.10), 0 4px 6px -2px rgb(0 0 0 / 0.05)",
        "elevation-5": "0 16px 32px -8px rgb(0 0 0 / 0.12), 0 6px 8px -4px rgb(0 0 0 / 0.06)",
      },
      transitionTimingFunction: {
        // Material's standard easing
        material: "cubic-bezier(0.4, 0, 0.2, 1)",
        "material-decel": "cubic-bezier(0, 0, 0.2, 1)",
        "material-accel": "cubic-bezier(0.4, 0, 1, 1)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
