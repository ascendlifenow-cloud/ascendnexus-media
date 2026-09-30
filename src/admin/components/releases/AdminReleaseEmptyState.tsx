import { Music2 } from "lucide-react";
import { PublicEmptyState } from "../../../components/fallback";

interface AdminReleaseEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminReleaseEmptyState({ hasFilters, onClearFilters }: AdminReleaseEmptyStateProps) {
  return (
    <PublicEmptyState
      title={hasFilters ? "No releases match these filters" : "No release records found"}
      message={
        hasFilters
          ? "Clear search and filters to return to the full admin release catalog."
          : "Song release records will appear here once admin data is available."
      }
      icon={<Music2 className="h-7 w-7" aria-hidden />}
      action={hasFilters ? { label: "Clear Filters", onClick: onClearFilters, variant: "glass" } : undefined}
    />
  );
}
