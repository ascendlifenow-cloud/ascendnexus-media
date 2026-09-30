import { UsersRound } from "lucide-react";
import { PublicEmptyState } from "../../../components/fallback";

interface AdminArtistEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminArtistEmptyState({ hasFilters, onClearFilters }: AdminArtistEmptyStateProps) {
  return (
    <PublicEmptyState
      title={hasFilters ? "No artists match these filters" : "No artist records found"}
      message={
        hasFilters
          ? "Clear search and filters to return to the full admin artist roster."
          : "Artist records will appear here once admin data is available."
      }
      icon={<UsersRound className="h-7 w-7" aria-hidden />}
      action={hasFilters ? { label: "Clear Filters", onClick: onClearFilters, variant: "glass" } : undefined}
    />
  );
}
