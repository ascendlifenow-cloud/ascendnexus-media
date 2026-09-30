import { ArrowRight, X } from "lucide-react";
import { PublicEmptyState } from "../fallback/PublicEmptyState";

interface BrowseEmptyStateProps {
  mode: "no-releases" | "no-results";
  onClearFilters?: () => void;
}

export function BrowseEmptyState({ mode, onClearFilters }: BrowseEmptyStateProps) {
  const title = mode === "no-releases" ? "No published releases yet" : "No releases found for the selected filters";
  const message =
    mode === "no-releases"
      ? "Published Ascend Nexus Media releases will appear here as the catalog opens."
      : "Try clearing filters or exploring the active artist roster.";

  return (
    <PublicEmptyState
      title={title}
      message={message}
      action={
        mode === "no-results" && onClearFilters
          ? { label: "Clear Filters", onClick: onClearFilters, icon: <X className="h-4 w-4" aria-hidden="true" />, variant: "glass" }
          : { label: "Explore Artists", to: "/artists", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }
      }
      secondaryAction={
        mode === "no-results"
          ? { label: "Explore Artists", to: "/artists", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />, variant: "primary" }
          : undefined
      }
    />
  );
}
