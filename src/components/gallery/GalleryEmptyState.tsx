import { ImageIcon } from "lucide-react";
import { PublicEmptyState } from "../fallback/PublicEmptyState";

interface GalleryEmptyStateProps {
  mode: "empty" | "filter";
  onViewAll?: () => void;
}

export function GalleryEmptyState({ mode, onViewAll }: GalleryEmptyStateProps) {
  const isFilterMode = mode === "filter";

  return (
    <PublicEmptyState
      title={isFilterMode ? "No visuals found for this filter." : "Gallery visuals are coming soon."}
      message={
        isFilterMode
          ? "Try another media type or return to the full public gallery."
          : "Published cover art, artist visuals, promo graphics, and video thumbnails will appear here."
      }
      icon={<ImageIcon className="h-7 w-7" aria-hidden="true" />}
      action={isFilterMode ? { label: "View All", onClick: onViewAll, variant: "secondary" } : undefined}
    />
  );
}
