import { Search } from "lucide-react";
import { PublicEmptyState } from "../../../components/fallback";

interface AdminMetadataEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminMetadataEmptyState({ hasFilters, onClearFilters }: AdminMetadataEmptyStateProps) {
  return (
    <PublicEmptyState
      title={hasFilters ? "No metadata records match your current filters" : "No metadata records are available yet"}
      message={hasFilters ? "Clear search and filters to return to the full metadata scan." : "Metadata records will appear once admin services are available."}
      icon={<Search className="h-7 w-7" aria-hidden />}
      action={hasFilters ? { label: "Clear Filters", onClick: onClearFilters, variant: "glass" } : undefined}
    />
  );
}
