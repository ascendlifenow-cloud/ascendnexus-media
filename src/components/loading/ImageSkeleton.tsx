import { skeletonBlockClassName } from "./skeletonUtils";
import { cx } from "../../utils/format";

type ImageSkeletonAspectRatio = "1:1" | "16:9" | "4:5" | "3:4";

interface ImageSkeletonProps {
  aspectRatio?: ImageSkeletonAspectRatio;
  rounded?: boolean;
  className?: string;
}

const aspectClasses: Record<ImageSkeletonAspectRatio, string> = {
  "1:1": "aspect-square",
  "16:9": "aspect-video",
  "4:5": "aspect-[4/5]",
  "3:4": "aspect-[3/4]",
};

export function ImageSkeleton({ aspectRatio = "1:1", rounded = true, className }: ImageSkeletonProps) {
  return (
    <div
      className={skeletonBlockClassName(cx("w-full", aspectClasses[aspectRatio], rounded ? "rounded-md" : "rounded-none", className), "purple")}
      aria-hidden="true"
    />
  );
}
