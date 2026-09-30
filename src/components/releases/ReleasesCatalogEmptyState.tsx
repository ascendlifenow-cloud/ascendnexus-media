import { UsersRound, X } from "lucide-react";
import { PublicEmptyState } from "../fallback/PublicEmptyState";

interface ReleasesCatalogEmptyStateProps {
  mode: "empty" | "no-results";
  onClearFilters?: () => void;
}

export function ReleasesCatalogEmptyState({ mode, onClearFilters }: ReleasesCatalogEmptyStateProps) {
  const isNoResults = mode === "no-results";

  return (
    <PublicEmptyState
      title={isNoResults ? "No releases match your current filters." : "No published releases are available yet."}
      message={
        isNoResults
          ? "Clear the filters or explore the active artist roster."
          : "Published Ascend Nexus Media releases will appear here as the catalog grows."
      }
      action={
        isNoResults
          ? { label: "Clear Filters", onClick: onClearFilters, icon: <X className="h-4 w-4" aria-hidden="true" />, variant: "glass" }
          : undefined
      }
      secondaryAction={
        isNoResults
          ? { label: "Explore Artists", to: "/artists", icon: <UsersRound className="h-4 w-4" aria-hidden="true" />, variant: "primary" }
          : undefined
      }
    />
  );
}
