import type { ReactNode } from "react";
import {
  ArtistImageAspectRatio,
  ArtistImageShape,
  ArtistImageSize,
  getArtistImageAspectClass,
  getArtistImageShapeClass,
  getArtistImageSizeClass,
} from "../../utils/artistImageUtils";
import { cx } from "../../utils/format";

interface ArtistImageFrameProps {
  children: ReactNode;
  size?: ArtistImageSize;
  shape?: ArtistImageShape;
  aspectRatio?: ArtistImageAspectRatio;
  className?: string;
}

export function ArtistImageFrame({ children, size = "card", shape = "rounded", aspectRatio = "1:1", className }: ArtistImageFrameProps) {
  return (
    <div
      className={cx(
        "relative isolate overflow-hidden bg-night shadow-2xl shadow-black/30",
        "ring-1 ring-white/10",
        getArtistImageSizeClass(size),
        size !== "avatar" && size !== "thumbnail" && getArtistImageAspectClass(aspectRatio),
        getArtistImageShapeClass(shape),
        className,
      )}
    >
      {children}
    </div>
  );
}
