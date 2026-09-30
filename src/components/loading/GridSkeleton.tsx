import type { ReactNode } from "react";
import { ArtistCardSkeleton, type ArtistCardSkeletonVariant } from "./ArtistCardSkeleton";
import { GallerySkeleton } from "./GallerySkeleton";
import { SongCardSkeleton, type SongCardSkeletonVariant } from "./SongCardSkeleton";
import { cx } from "../../utils/format";

type GridSkeletonVariant = "song" | "artist" | "gallery" | "block";

interface GridSkeletonProps {
  itemCount?: number;
  columns?: string;
  variant?: GridSkeletonVariant;
  songVariant?: SongCardSkeletonVariant;
  artistVariant?: ArtistCardSkeletonVariant;
  renderItem?: (index: number) => ReactNode;
  className?: string;
}

export function GridSkeleton({
  itemCount = 6,
  columns = "md:grid-cols-2 xl:grid-cols-3",
  variant = "song",
  songVariant = "grid",
  artistVariant = "directory",
  renderItem,
  className,
}: GridSkeletonProps) {
  if (variant === "gallery") {
    return <GallerySkeleton itemCount={itemCount} className={className} />;
  }

  return (
    <div className={cx("grid gap-6", columns, className)} aria-busy="true">
      <span className="sr-only">Loading results</span>
      {Array.from({ length: itemCount }).map((_, index) =>
        renderItem ? (
          <div key={index}>{renderItem(index)}</div>
        ) : variant === "artist" ? (
          <ArtistCardSkeleton key={index} variant={artistVariant} />
        ) : (
          <SongCardSkeleton key={index} variant={songVariant} />
        ),
      )}
    </div>
  );
}
