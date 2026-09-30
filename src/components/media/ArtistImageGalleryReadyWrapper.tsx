import type { ReactNode } from "react";
import { cx } from "../../utils/format";

interface ArtistImageGalleryReadyWrapperProps {
  children: ReactNode;
  artistName?: string;
  className?: string;
}

export function ArtistImageGalleryReadyWrapper({ children, artistName, className }: ArtistImageGalleryReadyWrapperProps) {
  return (
    <div className={cx("group/artist-image relative", className)} data-artist-image-title={artistName}>
      {children}
    </div>
  );
}
