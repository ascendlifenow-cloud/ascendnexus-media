import type {
  MediaPublicationActionType,
  MediaPublicationEntityType,
  MediaPublicationOperation,
  MediaPublicationOptions,
  MediaPublicationReadiness,
  MediaPublicationResult,
} from "../../models/publication";
import { mediaStorageService } from "../../services/storage";

const getHeaders = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");

interface OperationResponse {
  success: boolean;
  publicationOperation?: MediaPublicationOperation;
  publicationOperations?: MediaPublicationOperation[];
  readiness?: MediaPublicationReadiness;
  result?: MediaPublicationResult;
  health?: Record<string, unknown>;
  locks?: Array<Record<string, unknown>>;
  recovery?: Record<string, unknown>;
  errors?: string[];
}

export class AdminMediaPublicationService {
  async getPublicationReadiness(entityType: MediaPublicationEntityType, entityId: string): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/${entityType}/${entityId}/readiness`, { headers: getHeaders() });
    return response.json();
  }

  async publishEntity(entityType: MediaPublicationEntityType, entityId: string, options?: MediaPublicationOptions) {
    return this.entityAction(entityType, entityId, "publish", options);
  }

  async createPublicationOperation(entityType: MediaPublicationEntityType, entityId: string, actionType: MediaPublicationActionType, options?: MediaPublicationOptions): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ entityType, entityId, actionType, options }),
    });
    return response.json();
  }

  async unpublishEntity(entityType: MediaPublicationEntityType, entityId: string, options?: MediaPublicationOptions) {
    return this.entityAction(entityType, entityId, "unpublish", options);
  }

  async republishEntity(entityType: MediaPublicationEntityType, entityId: string, options?: MediaPublicationOptions) {
    return this.entityAction(entityType, entityId, "republish", options);
  }

  async archiveEntity(entityType: MediaPublicationEntityType, entityId: string, options?: MediaPublicationOptions) {
    return this.entityAction(entityType, entityId, "archive", options);
  }

  async restoreEntity(entityType: MediaPublicationEntityType, entityId: string, options?: MediaPublicationOptions) {
    return this.entityAction(entityType, entityId, "restore", options);
  }

  async rollbackEntity(entityType: MediaPublicationEntityType, entityId: string, options?: MediaPublicationOptions) {
    return this.entityAction(entityType, entityId, "rollback", options);
  }

  async getPublicationOperation(publicationOperationId: string): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/operations/${publicationOperationId}`, { headers: getHeaders() });
    return response.json();
  }

  async listPublicationOperations(filters: { entityType?: MediaPublicationEntityType; entityId?: string; actionType?: MediaPublicationActionType; status?: string } = {}): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, publicationOperations: [], errors: ["Backend media API is not configured."] };
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as Array<[string, string]>);
    const response = await fetch(`${base}/api/admin/publication/operations${params.size ? `?${params}` : ""}`, { headers: getHeaders() });
    return response.json();
  }

  async getPublicationHealth(): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/health`, { headers: getHeaders() });
    return response.json();
  }

  async listPublicationLocks(): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, locks: [], errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/locks`, { headers: getHeaders() });
    return response.json();
  }

  async recoverStalePublications(): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/recover-stale`, { method: "POST", headers: getHeaders(true), body: "{}" });
    return response.json();
  }

  async retryPublication(publicationOperationId: string) {
    return this.operationAction(publicationOperationId, "retry");
  }

  async rollbackPublication(publicationOperationId: string, options?: MediaPublicationOptions) {
    return this.operationAction(publicationOperationId, "rollback", options);
  }

  async cancelPublication(publicationOperationId: string) {
    return this.operationAction(publicationOperationId, "cancel");
  }

  private async entityAction(entityType: MediaPublicationEntityType, entityId: string, actionType: "publish" | "republish" | "unpublish" | "archive" | "restore" | "rollback", options?: MediaPublicationOptions): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/${entityType}/${entityId}/${actionType}`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ options }),
    });
    return response.json();
  }

  private async operationAction(publicationOperationId: string, actionType: "retry" | "rollback" | "cancel", options?: MediaPublicationOptions): Promise<OperationResponse> {
    const base = apiBase();
    if (!base) return { success: false, errors: ["Backend media API is not configured."] };
    const response = await fetch(`${base}/api/admin/publication/operations/${publicationOperationId}/${actionType}`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify({ options }),
    });
    return response.json();
  }
}

export const adminMediaPublicationService = new AdminMediaPublicationService();
