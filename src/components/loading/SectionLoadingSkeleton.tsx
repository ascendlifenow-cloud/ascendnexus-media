import { skeletonBlockClassName } from "./skeletonUtils";
import { cx } from "../../utils/format";

type SectionLoadingVariant = "default" | "compact" | "hero";

interface SectionLoadingSkeletonProps {
  titleWidth?: string;
  rows?: number;
  cards?: number;
  variant?: SectionLoadingVariant;
  className?: string;
}

export function SectionLoadingSkeleton({
  titleWidth = "w-64",
  rows = 2,
  cards = 3,
  variant = "default",
  className,
}: SectionLoadingSkeletonProps) {
  const isHero = variant === "hero";

  return (
    <div className={cx("rounded-anm-panel border border-white/10 bg-anm-surface-glass p-6 shadow-anm-card-glow", className)} aria-busy="true">
      <span className="sr-only">Loading section content</span>
      <div className={skeletonBlockClassName(cx("h-3", titleWidth), "sunrise")} aria-hidden="true" />
      <div className={skeletonBlockClassName(cx("mt-4 h-8", isHero ? "w-full max-w-xl" : "w-full max-w-md"), "purple")} aria-hidden="true" />
      <div className="mt-5 grid gap-3" aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={skeletonBlockClassName(cx("h-4", index === rows - 1 ? "w-2/3" : "w-full"), "default")} />
        ))}
      </div>
      {cards > 0 ? (
        <div className={cx("mt-7 grid gap-4", variant === "compact" ? "sm:grid-cols-2" : "md:grid-cols-3")} aria-hidden="true">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className={skeletonBlockClassName(cx("h-36", isHero && "md:h-52"), index % 2 ? "pink" : "blue")} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
