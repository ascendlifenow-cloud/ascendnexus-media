import { Images } from "lucide-react";
import { PublicEmptyState } from "../../../components/fallback";

interface AdminMediaEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminMediaEmptyState({ hasFilters, onClearFilters }: AdminMediaEmptyStateProps) {
  return (
    <PublicEmptyState
      title={hasFilters ? "No media assets match your current filters" : "No media assets have been added yet"}
      message={
        hasFilters
          ? "Clear search and filters to return to the full media library."
          : "Media assets will appear here once upload or admin-managed asset records are available."
      }
      icon={<Images className="h-7 w-7" aria-hidden />}
      action={hasFilters ? { label: "Clear Filters", onClick: onClearFilters, variant: "glass" } : undefined}
    />
  );
}
