import { useMemo, useState } from "react";
import type { AdminAuditActionType, AdminAuditEntityType, AdminAuditEvent, AdminAuditEventType } from "../../models/admin";
import { filterAdminAuditEvents, type AdminAuditSortMode } from "../utils/adminAuditUtils";

export const useAdminAuditFilters = (events: readonly AdminAuditEvent[]) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<AdminAuditEventType | "all">("all");
  const [actionTypeFilter, setActionTypeFilter] = useState<AdminAuditActionType | "all">("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<AdminAuditEntityType | "all">("all");
  const [sortMode, setSortMode] = useState<AdminAuditSortMode>("newest");

  const filteredEvents = useMemo(
    () =>
      filterAdminAuditEvents(events, {
        searchQuery,
        eventType: eventTypeFilter,
        actionType: actionTypeFilter,
        entityType: entityTypeFilter,
        sortMode,
      }),
    [actionTypeFilter, entityTypeFilter, eventTypeFilter, events, searchQuery, sortMode],
  );

  const hasFilters = Boolean(searchQuery.trim() || eventTypeFilter !== "all" || actionTypeFilter !== "all" || entityTypeFilter !== "all" || sortMode !== "newest");
  const clearFilters = () => {
    setSearchQuery("");
    setEventTypeFilter("all");
    setActionTypeFilter("all");
    setEntityTypeFilter("all");
    setSortMode("newest");
  };

  return {
    searchQuery,
    eventTypeFilter,
    actionTypeFilter,
    entityTypeFilter,
    sortMode,
    filteredEvents,
    hasFilters,
    setSearchQuery,
    setEventTypeFilter,
    setActionTypeFilter,
    setEntityTypeFilter,
    setSortMode,
    clearFilters,
  };
};
