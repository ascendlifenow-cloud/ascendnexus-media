import type { ReactNode } from "react";
import { cx } from "../../utils/format";
import {
  CoverArtAspectRatio,
  CoverArtSize,
  getCoverArtAspectClass,
  getCoverArtSizeClass,
} from "../../utils/coverArtUtils";

interface CoverArtFrameProps {
  children: ReactNode;
  size?: CoverArtSize;
  rounded?: boolean;
  aspectRatio?: CoverArtAspectRatio;
  className?: string;
}

export function CoverArtFrame({ children, size = "card", rounded = true, aspectRatio = "1:1", className }: CoverArtFrameProps) {
  return (
    <div
      className={cx(
        "relative isolate overflow-hidden bg-night shadow-2xl shadow-black/30",
        "ring-1 ring-white/10",
        getCoverArtSizeClass(size),
        getCoverArtAspectClass(aspectRatio),
        rounded && "rounded-anm-card",
        className,
      )}
    >
      {children}
    </div>
  );
}
