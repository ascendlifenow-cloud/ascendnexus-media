import { skeletonBlockClassName } from "./skeletonUtils";
import { cx } from "../../utils/format";

interface GallerySkeletonProps {
  itemCount?: number;
  className?: string;
}

export function GallerySkeleton({ itemCount = 8, className }: GallerySkeletonProps) {
  return (
    <div className={cx("grid gap-5 sm:grid-cols-2 lg:grid-cols-4", className)} aria-busy="true">
      <span className="sr-only">Loading gallery</span>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="rounded-anm-card border border-white/10 bg-anm-surface-glass p-3 shadow-anm-card-glow" aria-hidden="true">
          <div className={skeletonBlockClassName(index % 3 === 0 ? "aspect-video w-full" : "aspect-square w-full", index % 2 ? "pink" : "purple")} />
          <div className="mt-3 space-y-2">
            <div className={skeletonBlockClassName("h-4 w-4/5", "sunrise")} />
            <div className={skeletonBlockClassName("h-3 w-1/2", "default")} />
          </div>
        </div>
      ))}
    </div>
  );
}
