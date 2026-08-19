import type { Config } from "tailwindcss";

// ============================================================
// PitStop AI — Design tokens
// Estos valores son la única fuente de verdad de color/tipografía.
// Ningún componente debe usar hex sueltos: siempre theme.colors.*
// ============================================================
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#0a0b0d",
          900: "#111315",
          880: "#17191c",
        },
        steel: {
          800: "#2c3135",
          700: "#383e43",
          650: "#454c52",
        },
        titanium: {
          500: "#6b7280",
          300: "#9aa1a9",
        },
        line: {
          DEFAULT: "#3a4046",
          soft: "#2a2e32",
        },
        action: {
          orange: "#ff6a00",
          dim: "#b34b00",
        },
        state: {
          green: "#2ecc71",
          yellow: "#f4b400",
          red: "#e53935",
        },
        text: {
          hi: "#eef0f1",
          md: "#c2c7cb",
          lo: "#82888e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        bevel: "inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.4)",
        "orange-glow": "0 6px 14px -6px rgba(255,106,0,.35)",
      },
      keyframes: {
        scanY: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "8%": { opacity: "1" },
          "92%": { opacity: "1" },
          "100%": { transform: "translateY(2100%)", opacity: "0" },
        },
        pulse2: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: ".45" },
        },
      },
      animation: {
        scan: "scanY 3.2s cubic-bezier(.4,0,.2,1) infinite",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
