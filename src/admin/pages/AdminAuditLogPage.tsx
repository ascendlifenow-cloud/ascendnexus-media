import { PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { AdminPageHeader } from "../components";
import {
  AdminAuditActions,
  AdminAuditEmptyState,
  AdminAuditEventDetailPanel,
  AdminAuditStats,
  AdminAuditTable,
  AdminAuditToolbar,
} from "../components/audit";
import { useAdminAuditEvents } from "../hooks/useAdminAuditEvents";
import { useAdminAuditFilters } from "../hooks/useAdminAuditFilters";
import { useSelectedAuditEvent } from "../hooks/useSelectedAuditEvent";

const adminAuditMetadata = {
  title: "Admin Audit Log | Ascend Nexus Media",
  description: "Review admin activity, publishing actions, content changes, metadata updates, preview actions, and system events.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminAuditLogPage() {
  const eventsQuery = useAdminAuditEvents();
  const events = eventsQuery.data?.ok ? eventsQuery.data.data : [];
  const filters = useAdminAuditFilters(events);
  const selected = useSelectedAuditEvent();
  const hasError = eventsQuery.isError || eventsQuery.data?.ok === false;

  return (
    <div className="grid gap-6">
      <SEOHead metadata={adminAuditMetadata} disableSocial />
      <AdminPageHeader
        eyebrow="Operations"
        title="Audit Log"
        description="Review admin activity, publishing actions, content changes, metadata updates, preview actions, and system events across Ascend Nexus Media Web."
        status="mock"
        actions={<AdminAuditActions />}
      />

      {eventsQuery.isLoading ? <GridSkeleton itemCount={6} variant="block" columns="sm:grid-cols-2 xl:grid-cols-6" /> : null}
      {hasError ? <PublicLoadingErrorState /> : null}

      {!eventsQuery.isLoading && !hasError ? (
        <>
          <AdminAuditStats events={events} />
          <AdminAuditToolbar
            searchQuery={filters.searchQuery}
            eventTypeFilter={filters.eventTypeFilter}
            actionTypeFilter={filters.actionTypeFilter}
            entityTypeFilter={filters.entityTypeFilter}
            sortMode={filters.sortMode}
            resultCount={filters.filteredEvents.length}
            totalCount={events.length}
            hasFilters={filters.hasFilters}
            onSearchChange={filters.setSearchQuery}
            onEventTypeChange={filters.setEventTypeFilter}
            onActionTypeChange={filters.setActionTypeFilter}
            onEntityTypeChange={filters.setEntityTypeFilter}
            onSortModeChange={filters.setSortMode}
            onClearFilters={filters.clearFilters}
          />

          {filters.filteredEvents.length > 0 ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_24rem] xl:items-start">
              <AdminAuditTable events={filters.filteredEvents} onViewDetails={selected.selectEvent} />
              <div className="xl:sticky xl:top-24">
                <AdminAuditEventDetailPanel event={selected.selectedEvent} onClose={selected.clearSelectedEvent} />
              </div>
            </div>
          ) : (
            <AdminAuditEmptyState hasFilters={filters.hasFilters} onClearFilters={filters.clearFilters} />
          )}
        </>
      ) : null}
    </div>
  );
}
