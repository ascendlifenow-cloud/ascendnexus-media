import type { ReactNode } from "react";
import { GlowPanel } from "../ui/GlowPanel";
import { cx } from "../../utils/format";

interface FallbackGlowPanelProps {
  children: ReactNode;
  className?: string;
}

export function FallbackGlowPanel({ children, className }: FallbackGlowPanelProps) {
  return (
    <GlowPanel
      tone="purple"
      className={cx(
        "mx-auto max-w-4xl px-6 py-10 text-center sm:px-10 sm:py-12",
        "after:pointer-events-none after:absolute after:-bottom-16 after:left-8 after:h-44 after:w-44 after:rounded-full after:bg-anm-pink/18 after:blur-3xl",
        className,
      )}
    >
      {children}
    </GlowPanel>
  );
}
