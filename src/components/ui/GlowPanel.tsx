import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../utils/format";

interface GlowPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "pink" | "purple" | "sunrise" | "blue";
  children: ReactNode;
}

const toneClasses = {
  pink: "before:bg-anm-pink/24",
  purple: "before:bg-anm-purple/24",
  sunrise: "before:bg-anm-sunrise/22",
  blue: "before:bg-anm-blue/20",
};

export function GlowPanel({ tone = "blue", className, children, ...props }: GlowPanelProps) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-anm-panel border border-white/10 bg-anm-surface-glass shadow-anm-card-glow backdrop-blur-xl before:pointer-events-none before:absolute before:-right-12 before:-top-12 before:h-36 before:w-36 before:rounded-full before:blur-3xl",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="relative">{children}</div>
    </div>
  );
}
