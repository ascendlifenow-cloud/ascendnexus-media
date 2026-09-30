import type {
  AdminAuditActionType,
  AdminAuditEntityType,
  AdminAuditEvent,
  AdminAuditEventType,
  CreateAdminAuditEventInput,
} from "../../models/admin";
import {
  buildAuditSummary,
  createAuditEventId,
  filterAdminAuditEvents,
  sanitizeAuditSnapshot,
  type AdminAuditFilters,
} from "../../admin/utils/adminAuditUtils";
import { createApiError, createApiSuccess, type ApiResult } from "../api/httpClient";

export interface AdminAuditService {
  recordEvent(event: CreateAdminAuditEventInput): Promise<ApiResult<AdminAuditEvent>>;
  listEvents(filters?: AdminAuditFilters): Promise<ApiResult<AdminAuditEvent[]>>;
  getEvent(auditEventId: string): Promise<ApiResult<AdminAuditEvent>>;
  searchEvents(query: string): Promise<ApiResult<AdminAuditEvent[]>>;
  filterEvents(filters: AdminAuditFilters): Promise<ApiResult<AdminAuditEvent[]>>;
}

const adminUser = {
  userId: "mock-admin",
  userDisplayName: "Ascend Admin",
};

const now = Date.now();
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

const seedAuditEvents: AdminAuditEvent[] = [
  {
    auditEventId: "audit-seed-preview-homepage",
    eventType: "preview",
    actionType: "preview",
    entityType: "site_config",
    entityId: "homepage",
    entityLabel: "Homepage",
    route: "/admin/preview/homepage",
    summary: "Previewed homepage configuration",
    ...adminUser,
    createdAt: minutesAgo(8),
  },
  {
    auditEventId: "audit-seed-release-publish",
    eventType: "publishing",
    actionType: "publish",
    entityType: "release",
    entityId: "rel-nova-001",
    entityLabel: "Firefly Instructions",
    entitySlug: "firefly-instructions",
    route: "/admin/releases/rel-nova-001/edit",
    summary: "Published release \"Firefly Instructions\"",
    ...adminUser,
    createdAt: minutesAgo(25),
  },
  {
    auditEventId: "audit-seed-metadata-update",
    eventType: "metadata",
    actionType: "metadata_update",
    entityType: "seo_metadata",
    entityId: "metadata-release-rel-nova-001",
    entityLabel: "Firefly Instructions Metadata",
    route: "/admin/seo/metadata-release-rel-nova-001/edit",
    summary: "Updated SEO metadata for \"Firefly Instructions\"",
    ...adminUser,
    createdAt: minutesAgo(43),
  },
  {
    auditEventId: "audit-seed-artist-update",
    eventType: "content",
    actionType: "update",
    entityType: "artist",
    entityId: "artist-nova-rea",
    entityLabel: "Nova Rea",
    entitySlug: "nova-rea",
    route: "/admin/artists/artist-nova-rea/edit",
    summary: "Updated artist \"Nova Rea\"",
    ...adminUser,
    createdAt: minutesAgo(66),
  },
  {
    auditEventId: "audit-seed-settings-update",
    eventType: "settings",
    actionType: "settings_update",
    entityType: "site_config",
    entityId: "site-settings",
    entityLabel: "Site Settings",
    route: "/admin/settings",
    summary: "Updated site settings readiness values",
    ...adminUser,
    createdAt: minutesAgo(92),
  },
];

export class InMemoryAdminAuditService implements AdminAuditService {
  private events: AdminAuditEvent[] = [...seedAuditEvents];

  async recordEvent(event: CreateAdminAuditEventInput): Promise<ApiResult<AdminAuditEvent>> {
    try {
      const safeEvent: AdminAuditEvent = {
        ...event,
        auditEventId: event.auditEventId ?? createAuditEventId(),
        summary: event.summary || buildAuditSummary(event),
        userId: event.userId ?? adminUser.userId,
        userDisplayName: event.userDisplayName ?? adminUser.userDisplayName,
        before: sanitizeAuditSnapshot(event.before),
        after: sanitizeAuditSnapshot(event.after),
        metadata: sanitizeAuditSnapshot(event.metadata),
        createdAt: event.createdAt ?? new Date().toISOString(),
      };
      this.events = [safeEvent, ...this.events];
      return createApiSuccess(safeEvent);
    } catch (error) {
      if (import.meta.env.DEV) console.warn("Audit event recording failed.", error);
      return createApiError("server_error", "Audit event could not be recorded.", 500);
    }
  }

  async listEvents(filters: AdminAuditFilters = {}): Promise<ApiResult<AdminAuditEvent[]>> {
    return createApiSuccess(filterAdminAuditEvents(this.events, filters));
  }

  async getEvent(auditEventId: string): Promise<ApiResult<AdminAuditEvent>> {
    const event = this.events.find((item) => item.auditEventId === auditEventId);
    return event ? createApiSuccess(event) : createApiError("not_found", "Audit event was not found.", 404);
  }

  async searchEvents(query: string): Promise<ApiResult<AdminAuditEvent[]>> {
    return this.listEvents({ searchQuery: query });
  }

  async filterEvents(filters: AdminAuditFilters): Promise<ApiResult<AdminAuditEvent[]>> {
    return this.listEvents(filters);
  }
}

export const adminAuditService = new InMemoryAdminAuditService();

interface RecordAuditHelperInput {
  actionType?: AdminAuditActionType;
  entityId?: string;
  entityLabel?: string;
  entitySlug?: string;
  route?: string;
  summary?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}

const recordScopedAuditEvent = (
  eventType: AdminAuditEventType,
  entityType: AdminAuditEntityType,
  input: RecordAuditHelperInput,
): void => {
  void adminAuditService.recordEvent({
    eventType,
    entityType,
    ...input,
    actionType: input.actionType ?? "custom",
    summary: input.summary ?? buildAuditSummary({ actionType: input.actionType ?? "custom", entityType, entityLabel: input.entityLabel }),
  });
};

export const recordArtistAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("content", "artist", input);
export const recordReleaseAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("content", "release", input);
export const recordMediaAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("media", "media_asset", input);
export const recordGalleryAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("gallery", "gallery_item", input);
export const recordHomepageAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("homepage", "homepage_section", input);
export const recordMetadataAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("metadata", "seo_metadata", input);
export const recordSettingsAuditEvent = (input: RecordAuditHelperInput) => recordScopedAuditEvent("settings", "site_config", input);
export const recordPublishingAuditEvent = (entityType: AdminAuditEntityType, input: RecordAuditHelperInput) =>
  recordScopedAuditEvent("publishing", entityType, input);
export const recordPreviewAuditEvent = (entityType: AdminAuditEntityType, input: RecordAuditHelperInput) =>
  recordScopedAuditEvent("preview", entityType, { ...input, actionType: input.actionType ?? "preview" });
