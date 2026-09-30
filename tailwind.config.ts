import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#090a0f",
        night: "#111522",
        cyanGlow: "#56d7ff",
        amberGlow: "#f7b14a",
        rosePulse: "#f35bb9",
        "anm-bg": "#090a0f",
        "anm-bg-soft": "#111522",
        "anm-bg-violet": "#171026",
        "anm-surface": "#171826",
        "anm-surface-glass": "rgba(255,255,255,0.075)",
        "anm-purple": "#8b5cf6",
        "anm-pink": "#ff5bbd",
        "anm-magenta": "#d946ef",
        "anm-sunrise": "#ff8a3d",
        "anm-gold": "#f8d37a",
        "anm-blue": "#56d7ff",
        "anm-lavender": "#c4b5fd",
        "anm-rose": "#fda4af",
        "anm-muted": "#a8adbd",
        "anm-border": "rgba(255,255,255,0.14)",
        "anm-disabled": "#636878",
        "anm-success": "#5ee4a7",
        "anm-warning": "#f8d37a",
        "anm-error": "#ff6b7a",
        "anm-info": "#56d7ff",
      },
      boxShadow: {
        glow: "0 0 42px rgba(86, 215, 255, 0.18)",
        amber: "0 0 34px rgba(247, 177, 74, 0.18)",
        "anm-soft-glow": "0 18px 70px rgba(86, 215, 255, 0.16)",
        "anm-card-glow": "0 24px 80px rgba(0, 0, 0, 0.34), 0 0 34px rgba(217, 70, 239, 0.10)",
        "anm-pink-glow": "0 0 42px rgba(255, 91, 189, 0.22)",
        "anm-purple-glow": "0 0 46px rgba(139, 92, 246, 0.24)",
        "anm-sunrise-glow": "0 0 42px rgba(255, 138, 61, 0.22)",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "anm-card": "0.5rem",
        "anm-panel": "0.75rem",
        "anm-pill": "999px",
      },
      backgroundImage: {
        "anm-hero-gradient":
          "linear-gradient(110deg, rgba(9,10,15,0.96), rgba(23,16,38,0.76) 46%, rgba(9,10,15,0.28)), radial-gradient(circle at 78% 22%, rgba(255,91,189,0.24), transparent 34%), radial-gradient(circle at 18% 84%, rgba(255,138,61,0.18), transparent 32%)",
        "anm-card-gradient":
          "linear-gradient(145deg, rgba(255,255,255,0.095), rgba(255,255,255,0.035))",
        "anm-sunrise-glow":
          "radial-gradient(circle at 50% 0%, rgba(255,138,61,0.24), transparent 42%)",
        "anm-purple-glow":
          "radial-gradient(circle at 50% 0%, rgba(139,92,246,0.24), transparent 44%)",
        "anm-page-gradient":
          "linear-gradient(180deg, #090a0f 0%, #111522 46%, #090a0f 100%)",
      },
      transitionTimingFunction: {
        "anm-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
