import { skeletonBlockClassName } from "./skeletonUtils";
import { cx } from "../../utils/format";

interface AudioPreviewSkeletonProps {
  compact?: boolean;
  showTime?: boolean;
  className?: string;
}

export function AudioPreviewSkeleton({ compact = false, showTime = true, className }: AudioPreviewSkeletonProps) {
  if (compact) {
    return (
      <div className={cx("flex items-center gap-2 rounded-md border border-white/10 bg-black/18 p-2", className)} aria-busy="true">
        <span className="sr-only">Loading audio preview</span>
        <div className={skeletonBlockClassName("h-10 w-24", "blue")} aria-hidden="true" />
        <div className={skeletonBlockClassName("h-2 flex-1 rounded-full", "pink")} aria-hidden="true" />
        {showTime ? <div className={skeletonBlockClassName("h-3 w-16", "default")} aria-hidden="true" /> : null}
      </div>
    );
  }

  return (
    <div className={cx("anm-glass-panel p-5", className)} aria-busy="true">
      <span className="sr-only">Loading audio preview</span>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between" aria-hidden="true">
        <div className="space-y-3">
          <div className={skeletonBlockClassName("h-3 w-36", "blue")} />
          <div className={skeletonBlockClassName("h-7 w-64 max-w-full", "sunrise")} />
          <div className={skeletonBlockClassName("h-3 w-44", "default")} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className={skeletonBlockClassName("h-12 w-36", "blue")} />
          <div className={skeletonBlockClassName("h-12 w-28", "default")} />
        </div>
      </div>
      <div className={skeletonBlockClassName("mt-6 h-2.5 w-full rounded-full", "pink")} aria-hidden="true" />
      {showTime ? <div className={skeletonBlockClassName("ml-auto mt-3 h-3 w-20", "default")} aria-hidden="true" /> : null}
    </div>
  );
}
