import { cx } from "./format";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "glass" | "danger" | "disabled";
export type ButtonSize = "sm" | "md" | "lg" | "icon";
export type CardVariant = "default" | "glass" | "feature" | "media" | "artist" | "song" | "compact";
export type BadgeVariant = "pink" | "purple" | "sunrise" | "neutral" | "glass";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border border-anm-gold/45 bg-anm-sunrise text-anm-bg shadow-anm-sunrise-glow hover:bg-anm-gold",
  secondary: "border border-anm-blue/35 bg-anm-blue text-anm-bg shadow-anm-soft-glow hover:bg-white",
  ghost: "border border-white/16 bg-transparent text-white hover:bg-white/10",
  glass: "border border-white/14 bg-white/[0.075] text-white backdrop-blur hover:border-anm-pink/45 hover:bg-white/12",
  danger: "border border-anm-error/45 bg-anm-error text-anm-bg hover:bg-white",
  disabled: "cursor-not-allowed border border-white/10 bg-white/[0.035] text-white/36",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-sm",
  icon: "h-11 w-11 p-0",
};

const cardVariants: Record<CardVariant, string> = {
  default: "rounded-anm-card border border-white/10 bg-anm-surface shadow-anm-card-glow",
  glass: "rounded-anm-card border border-white/10 bg-anm-surface-glass shadow-anm-card-glow backdrop-blur-xl",
  feature: "rounded-anm-panel border border-anm-gold/20 bg-anm-card-gradient shadow-anm-sunrise-glow",
  media: "rounded-anm-card border border-white/10 bg-anm-bg-soft shadow-2xl shadow-black/30",
  artist: "rounded-anm-card border border-white/10 bg-anm-card-gradient shadow-anm-card-glow",
  song: "rounded-anm-card border border-white/10 bg-anm-card-gradient shadow-anm-card-glow",
  compact: "rounded-md border border-white/10 bg-white/[0.055]",
};

const badgeVariants: Record<BadgeVariant, string> = {
  pink: "border border-anm-pink/30 bg-anm-pink/16 text-pink-100",
  purple: "border border-anm-purple/30 bg-anm-purple/16 text-anm-lavender",
  sunrise: "border border-anm-gold/35 bg-anm-sunrise/18 text-anm-gold",
  neutral: "border border-white/12 bg-white/[0.075] text-white/76",
  glass: "border border-white/12 bg-black/24 text-white/82 backdrop-blur",
};

export const getButtonClassName = (variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-md font-bold transition duration-300 ease-anm-out anm-focus disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant] ?? buttonVariants.primary,
    buttonSizes[size] ?? buttonSizes.md,
    className,
  );

export const getCardClassName = (variant: CardVariant = "default", interactive = false, className?: string) =>
  cx(cardVariants[variant] ?? cardVariants.default, interactive && "anm-card-hover", className);

export const getBadgeClassName = (variant: BadgeVariant = "neutral", className?: string) =>
  cx("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold", badgeVariants[variant], className);
