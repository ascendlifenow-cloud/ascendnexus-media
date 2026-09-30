import type {
  AdminAuditActionType,
  AdminAuditEntityType,
  AdminAuditEvent,
  AdminAuditEventType,
  AdminAuditSnapshot,
  AdminAuditSnapshotValue,
  CreateAdminAuditEventInput,
} from "../../models/admin";

export type AdminAuditSortMode = "newest" | "oldest" | "entity_type" | "action_type";

export interface AdminAuditFilters {
  searchQuery?: string;
  eventType?: AdminAuditEventType | "all";
  actionType?: AdminAuditActionType | "all";
  entityType?: AdminAuditEntityType | "all";
  sortMode?: AdminAuditSortMode;
}

export interface AdminAuditStatsSummary {
  totalEvents: number;
  publishingEvents: number;
  contentUpdates: number;
  metadataUpdates: number;
  settingsUpdates: number;
  previewEvents: number;
}

const sensitiveKeyPattern = /secret|token|password|api[_-]?key|authorization|credential|private/i;

export const formatAuditEventType = (value: AdminAuditEventType | "all"): string =>
  value === "all" ? "All" : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatAuditActionType = (value: AdminAuditActionType | "all"): string =>
  value === "all" ? "All" : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatAuditEntityType = (value: AdminAuditEntityType | "all"): string =>
  value === "all" ? "All" : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const toSearchText = (event: AdminAuditEvent): string =>
  [
    event.summary,
    event.entityLabel,
    event.entitySlug,
    event.entityId,
    event.userDisplayName,
    event.actionType,
    event.entityType,
    event.eventType,
    event.route,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const searchAdminAuditEvents = (
  events: readonly AdminAuditEvent[] | null | undefined,
  query: string | null | undefined,
): AdminAuditEvent[] => {
  const items = Array.isArray(events) ? [...events] : [];
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return items;
  return items.filter((event) => toSearchText(event).includes(normalizedQuery));
};

export const sortAdminAuditEvents = (
  events: readonly AdminAuditEvent[] | null | undefined,
  sortMode: AdminAuditSortMode = "newest",
): AdminAuditEvent[] =>
  (Array.isArray(events) ? [...events] : []).sort((a, b) => {
    if (sortMode === "entity_type") return a.entityType.localeCompare(b.entityType) || b.createdAt.localeCompare(a.createdAt);
    if (sortMode === "action_type") return a.actionType.localeCompare(b.actionType) || b.createdAt.localeCompare(a.createdAt);
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return a.auditEventId.localeCompare(b.auditEventId);
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
  });

export const filterAdminAuditEvents = (
  events: readonly AdminAuditEvent[] | null | undefined,
  filters: AdminAuditFilters = {},
): AdminAuditEvent[] => {
  const searched = searchAdminAuditEvents(events, filters.searchQuery);
  const eventType = filters.eventType ?? "all";
  const actionType = filters.actionType ?? "all";
  const entityType = filters.entityType ?? "all";
  return sortAdminAuditEvents(
    searched
      .filter((event) => (eventType === "all" ? true : event.eventType === eventType))
      .filter((event) => (actionType === "all" ? true : event.actionType === actionType))
      .filter((event) => (entityType === "all" ? true : event.entityType === entityType)),
    filters.sortMode ?? "newest",
  );
};

export const getAdminAuditStats = (events: readonly AdminAuditEvent[] | null | undefined): AdminAuditStatsSummary => {
  const items = Array.isArray(events) ? events : [];
  return {
    totalEvents: items.length,
    publishingEvents: items.filter((event) => event.eventType === "publishing").length,
    contentUpdates: items.filter((event) => event.eventType === "content" && ["create", "update", "save_draft"].includes(event.actionType)).length,
    metadataUpdates: items.filter((event) => event.eventType === "metadata" || event.actionType === "metadata_update").length,
    settingsUpdates: items.filter((event) => event.eventType === "settings" || event.actionType === "settings_update").length,
    previewEvents: items.filter((event) => event.eventType === "preview" || event.actionType === "preview").length,
  };
};

const sanitizeSnapshotValue = (value: unknown): AdminAuditSnapshotValue => {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value as AdminAuditSnapshotValue;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeSnapshotValue);
  if (value && typeof value === "object") return sanitizeAuditSnapshot(value as Record<string, unknown>) ?? {};
  return String(value ?? "");
};

export const sanitizeAuditSnapshot = (snapshot: unknown): AdminAuditSnapshot | undefined => {
  if (!snapshot || typeof snapshot !== "object") return undefined;
  return Object.entries(snapshot).reduce<AdminAuditSnapshot>((safe, [key, value]) => {
    if (sensitiveKeyPattern.test(key)) {
      safe[key] = "[redacted]";
      return safe;
    }
    safe[key] = sanitizeSnapshotValue(value);
    return safe;
  }, {});
};

export const buildAuditSummary = (event: Pick<CreateAdminAuditEventInput, "actionType" | "entityType" | "entityLabel">): string => {
  const action = formatAuditActionType(event.actionType).replace("Update", "Updated");
  const entity = formatAuditEntityType(event.entityType).toLowerCase();
  return `${action} ${entity}${event.entityLabel ? ` "${event.entityLabel}"` : ""}`;
};

export const createAuditEventId = (prefix = "audit"): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
