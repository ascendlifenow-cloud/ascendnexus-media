import { Images } from "lucide-react";
import { PublicEmptyState } from "../../../components/fallback";

interface AdminGalleryEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminGalleryEmptyState({ hasFilters, onClearFilters }: AdminGalleryEmptyStateProps) {
  return (
    <PublicEmptyState
      title={hasFilters ? "No gallery items match your current filters" : "No gallery items have been created yet"}
      message={
        hasFilters
          ? "Clear search and filters to return to the full admin gallery set."
          : "Gallery items will appear here once admin curation records are available."
      }
      icon={<Images className="h-7 w-7" aria-hidden />}
      action={hasFilters ? { label: "Clear Filters", onClick: onClearFilters, variant: "glass" } : undefined}
    />
  );
}
