export const brandThemeTokens = {
  colors: {
    background: "anm-bg",
    backgroundSoft: "anm-bg-soft",
    surface: "anm-surface",
    glass: "anm-surface-glass",
    purple: "anm-purple",
    pink: "anm-pink",
    magenta: "anm-magenta",
    sunrise: "anm-sunrise",
    gold: "anm-gold",
    blue: "anm-blue",
    muted: "anm-muted",
    border: "anm-border",
  },
  gradients: {
    hero: "bg-anm-hero-gradient",
    page: "bg-anm-page-gradient",
    card: "bg-anm-card-gradient",
    sunriseGlow: "bg-anm-sunrise-glow",
    purpleGlow: "bg-anm-purple-glow",
  },
  radius: {
    card: "rounded-anm-card",
    panel: "rounded-anm-panel",
    pill: "rounded-anm-pill",
  },
} as const;

export type ThemeTone = "pink" | "purple" | "sunrise" | "gold" | "blue" | "neutral" | "glass";
