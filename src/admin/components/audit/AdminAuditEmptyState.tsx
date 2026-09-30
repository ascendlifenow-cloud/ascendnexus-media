import { Button } from "../../../components/ui/Button";
import { AdminSectionCard } from "../AdminSectionCard";

interface AdminAuditEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AdminAuditEmptyState({ hasFilters, onClearFilters }: AdminAuditEmptyStateProps) {
  return (
    <AdminSectionCard
      title={hasFilters ? "No audit events match your current filters." : "No audit events have been recorded yet."}
      description={hasFilters ? "Adjust or clear filters to return to the full audit trail." : "Admin activity will appear here as audit events are recorded."}
    >
      {hasFilters ? (
        <Button type="button" variant="glass" onClick={onClearFilters}>
          Clear Filters
        </Button>
      ) : (
        <p className="text-sm text-white/56">Future backend persistence can hydrate this page from a durable audit table.</p>
      )}
    </AdminSectionCard>
  );
}
