import { cx } from "../../utils/format";

export type SkeletonTone = "default" | "pink" | "purple" | "sunrise" | "blue";

const toneClasses: Record<SkeletonTone, string> = {
  default: "from-white/[0.055] via-white/[0.11] to-white/[0.055]",
  pink: "from-white/[0.055] via-anm-pink/18 to-white/[0.055]",
  purple: "from-white/[0.055] via-anm-purple/18 to-white/[0.055]",
  sunrise: "from-white/[0.055] via-anm-gold/18 to-white/[0.055]",
  blue: "from-white/[0.055] via-anm-blue/18 to-white/[0.055]",
};

export const skeletonBlockClassName = (className?: string, tone: SkeletonTone = "default") =>
  cx(
    "anm-skeleton relative overflow-hidden rounded-md border border-white/10 bg-gradient-to-r shadow-anm-card-glow",
    toneClasses[tone],
    className,
  );
