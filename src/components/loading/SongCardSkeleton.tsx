import { skeletonBlockClassName } from "./skeletonUtils";
import { cx } from "../../utils/format";

export type SongCardSkeletonVariant = "carousel" | "grid" | "compact" | "featured" | "related";

interface SongCardSkeletonProps {
  variant?: SongCardSkeletonVariant;
  className?: string;
}

export function SongCardSkeleton({ variant = "grid", className }: SongCardSkeletonProps) {
  if (variant === "compact" || variant === "related") {
    return (
      <div className={cx("flex items-center gap-4 rounded-anm-card border border-white/10 bg-anm-surface-glass p-3", className)} aria-hidden="true">
        <div className={skeletonBlockClassName("h-16 w-16 shrink-0", "purple")} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={skeletonBlockClassName("h-4 w-3/4", "sunrise")} />
          <div className={skeletonBlockClassName("h-3 w-1/2", "default")} />
          <div className={skeletonBlockClassName("h-3 w-2/3", "blue")} />
        </div>
      </div>
    );
  }

  const isFeatured = variant === "featured";

  return (
    <div className={cx("rounded-anm-card border border-white/10 bg-anm-card-gradient p-4 shadow-anm-card-glow", className)} aria-hidden="true">
      <div className={skeletonBlockClassName(cx("aspect-square w-full", isFeatured && "md:aspect-[16/10]"), "purple")} />
      <div className="mt-4 space-y-3">
        <div className={skeletonBlockClassName("h-5 w-4/5", "sunrise")} />
        <div className={skeletonBlockClassName("h-3 w-1/2", "default")} />
        <div className="flex gap-2">
          <div className={skeletonBlockClassName("h-7 w-20", "pink")} />
          <div className={skeletonBlockClassName("h-7 w-24", "blue")} />
        </div>
      </div>
    </div>
  );
}
