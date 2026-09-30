import { skeletonBlockClassName } from "./skeletonUtils";
import { cx } from "../../utils/format";

export type ArtistCardSkeletonVariant = "directory" | "spotlight" | "compact" | "featured" | "horizontal";

interface ArtistCardSkeletonProps {
  variant?: ArtistCardSkeletonVariant;
  className?: string;
}

export function ArtistCardSkeleton({ variant = "directory", className }: ArtistCardSkeletonProps) {
  if (variant === "compact" || variant === "horizontal") {
    return (
      <div className={cx("flex items-center gap-4 rounded-anm-card border border-white/10 bg-anm-surface-glass p-4", className)} aria-hidden="true">
        <div className={skeletonBlockClassName("h-16 w-16 shrink-0 rounded-full", "pink")} />
        <div className="flex-1 space-y-2">
          <div className={skeletonBlockClassName("h-4 w-2/3", "sunrise")} />
          <div className={skeletonBlockClassName("h-3 w-full", "default")} />
          <div className={skeletonBlockClassName("h-3 w-1/2", "blue")} />
        </div>
      </div>
    );
  }

  const isFeatured = variant === "featured";

  return (
    <div className={cx("rounded-anm-card border border-white/10 bg-anm-card-gradient p-4 shadow-anm-card-glow", className)} aria-hidden="true">
      <div className={skeletonBlockClassName(cx("w-full", isFeatured ? "aspect-[16/10]" : "aspect-[4/5]"), "pink")} />
      <div className="mt-4 space-y-3">
        <div className={skeletonBlockClassName("h-5 w-3/4", "sunrise")} />
        <div className={skeletonBlockClassName("h-3 w-full", "default")} />
        <div className={skeletonBlockClassName("h-3 w-5/6", "default")} />
        <div className="flex gap-2">
          <div className={skeletonBlockClassName("h-7 w-20", "purple")} />
          <div className={skeletonBlockClassName("h-7 w-24", "blue")} />
        </div>
      </div>
    </div>
  );
}
