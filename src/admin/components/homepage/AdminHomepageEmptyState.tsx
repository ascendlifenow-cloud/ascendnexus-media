import { LayoutDashboard } from "lucide-react";
import { PublicEmptyState } from "../../../components/fallback";

interface AdminHomepageEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminHomepageEmptyState({ hasFilters, onClearFilters }: AdminHomepageEmptyStateProps) {
  return (
    <PublicEmptyState
      title={hasFilters ? "No homepage sections match your current filters" : "No homepage sections have been configured yet"}
      message={
        hasFilters
          ? "Clear search and filters to return to the full homepage layout."
          : "Homepage sections will appear here once site configuration is available."
      }
      icon={<LayoutDashboard className="h-7 w-7" aria-hidden />}
      action={hasFilters ? { label: "Clear Filters", onClick: onClearFilters, variant: "glass" } : undefined}
    />
  );
}
