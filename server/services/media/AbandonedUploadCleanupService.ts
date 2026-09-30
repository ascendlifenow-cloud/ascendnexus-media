import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { directMediaUploadSessionPersistenceService } from "./DirectMediaUploadSessionPersistenceService";

export class AbandonedUploadCleanupService {
  async findExpiredSessions() {
    const now = Date.now();
    return (await directMediaUploadSessionPersistenceService.list()).filter((session) =>
      !["completed", "failed", "canceled", "expired"].includes(session.status) &&
      new Date(session.expiresAt).getTime() <= now,
    );
  }

  async abortExpiredMultipartUploads() {
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const expired = await this.findExpiredSessions();
    const results: Array<{ uploadSessionId: string; aborted: boolean; warning?: string }> = [];
    for (const session of expired) {
      let aborted = false;
      let warning: string | undefined;
      if (session.multipartUploadId && provider.abortMultipartUpload) {
        try {
          aborted = await provider.abortMultipartUpload(session.storagePath, session.multipartUploadId);
        } catch (error) {
          warning = error instanceof Error ? error.message : "Abort failed.";
        }
      }
      await directMediaUploadSessionPersistenceService.mark(session.uploadSessionId, "expired", {
        warnings: warning ? [...(session.warnings ?? []), warning] : session.warnings,
      });
      await mediaAuditPersistenceService.record("abandoned_upload_cleaned", `Marked abandoned upload "${session.originalFileName}" as expired`, {
        actorId: session.createdBy,
        entityType: "direct_media_upload_session",
        entityId: session.uploadSessionId,
        metadata: { aborted },
      });
      results.push({ uploadSessionId: session.uploadSessionId, aborted, warning });
    }
    return results;
  }

  async markExpiredSessions() {
    return this.abortExpiredMultipartUploads();
  }

  async cleanOrphanedStorageObjects() {
    return [];
  }

  async cleanTemporaryFiles() {
    return [];
  }

  async runCleanup() {
    const expiredSessions = await this.abortExpiredMultipartUploads();
    return { success: true, expiredSessions, orphanedStorageObjects: [], temporaryFiles: [] };
  }
}

export const abandonedUploadCleanupService = new AbandonedUploadCleanupService();
