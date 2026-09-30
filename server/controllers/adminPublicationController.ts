import type { IncomingMessage, ServerResponse } from "node:http";
import type { MediaPublicationActionType, MediaPublicationEntityType, MediaPublicationOptions, MediaPublicationStatus } from "../models/mediaModels";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaPublicationOrchestrationService } from "../services/publication/MediaPublicationOrchestrationService";
import { createPublicationError } from "../utils/publication/publicationErrorUtils";

const actionPermission: Record<string, string> = {
  publish: "publication.publish",
  republish: "publication.publish",
  activate: "publication.publish",
  unpublish: "publication.unpublish",
  archive: "publication.archive",
  restore: "publication.restore",
  rollback: "publication.rollback",
  retry: "publication.retry",
  cancel: "publication.cancel",
};

export class AdminPublicationController {
  async createOperation(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    const body = await parseJsonBody(request).catch(() => ({})) as {
      entityType?: MediaPublicationEntityType;
      entityId?: string;
      actionType?: MediaPublicationActionType;
      options?: MediaPublicationOptions;
    };
    if (!body.entityType || !body.entityId || !body.actionType) {
      throw createPublicationError({ code: "PUBLICATION_REQUEST_INVALID", message: "entityType, entityId, and actionType are required.", retryable: false });
    }
    mediaAuthorizationService.requirePermission(auth, actionPermission[body.actionType] ?? "publication.publish");
    const operation = await mediaPublicationOrchestrationService.startPublication((await mediaPublicationOrchestrationService.createPublicationOperation(
      body.entityType,
      body.entityId,
      body.actionType,
      body.options,
      auth.adminId,
    )).publicationOperationId);
    sendJson(response, 200, { success: true, publicationOperation: operation, result: await mediaPublicationOrchestrationService.buildPublicationResult(operation.publicationOperationId) });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    sendJson(response, 200, { success: true, health: await mediaPublicationOrchestrationService.getPublicationHealth() });
  }

  async locks(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    sendJson(response, 200, { success: true, locks: await mediaPublicationOrchestrationService.listLocks() });
  }

  async recoverStale(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.retry");
    sendJson(response, 200, { success: true, recovery: await mediaPublicationOrchestrationService.recoverStalePublications() });
  }

  async readiness(request: IncomingMessage, response: ServerResponse, entityType: string, entityId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    sendJson(response, 200, {
      success: true,
      readiness: await mediaPublicationOrchestrationService.validatePublicationReadiness(entityType as MediaPublicationEntityType, entityId),
    });
  }

  async listOperations(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    sendJson(response, 200, {
      success: true,
      publicationOperations: await mediaPublicationOrchestrationService.listPublicationOperations({
        entityType: url.searchParams.get("entityType") as MediaPublicationEntityType | undefined,
        entityId: url.searchParams.get("entityId") ?? undefined,
        actionType: url.searchParams.get("actionType") as MediaPublicationActionType | undefined,
        status: url.searchParams.get("status") as MediaPublicationStatus | undefined,
      }),
    });
  }

  async getOperation(request: IncomingMessage, response: ServerResponse, publicationOperationId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.read");
    const operation = await mediaPublicationOrchestrationService.getPublicationOperation(publicationOperationId);
    if (!operation) throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_FOUND", message: "Publication operation was not found.", retryable: false, publicationOperationId });
    sendJson(response, 200, { success: true, publicationOperation: operation, result: await mediaPublicationOrchestrationService.buildPublicationResult(publicationOperationId) });
  }

  async entityAction(request: IncomingMessage, response: ServerResponse, entityType: string, entityId: string, actionType: MediaPublicationActionType) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, actionPermission[actionType] ?? "publication.publish");
    const body = await parseJsonBody(request).catch(() => ({})) as { options?: MediaPublicationOptions };
    const operation =
      actionType === "unpublish" ? await mediaPublicationOrchestrationService.unpublishEntityMedia(entityType as MediaPublicationEntityType, entityId, body.options, auth.adminId) :
      actionType === "archive" ? await mediaPublicationOrchestrationService.archiveEntityMedia(entityType as MediaPublicationEntityType, entityId, body.options, auth.adminId) :
      actionType === "restore" ? await mediaPublicationOrchestrationService.startPublication((await mediaPublicationOrchestrationService.createPublicationOperation(entityType as MediaPublicationEntityType, entityId, "restore", body.options, auth.adminId)).publicationOperationId) :
      actionType === "rollback" ? await mediaPublicationOrchestrationService.startPublication((await mediaPublicationOrchestrationService.createPublicationOperation(entityType as MediaPublicationEntityType, entityId, "rollback", body.options, auth.adminId)).publicationOperationId) :
      actionType === "republish" ? await mediaPublicationOrchestrationService.startPublication((await mediaPublicationOrchestrationService.createPublicationOperation(entityType as MediaPublicationEntityType, entityId, "republish", body.options, auth.adminId)).publicationOperationId) :
      await mediaPublicationOrchestrationService.publishEntityMedia(entityType as MediaPublicationEntityType, entityId, body.options, auth.adminId);
    sendJson(response, 200, { success: true, publicationOperation: operation, result: await mediaPublicationOrchestrationService.buildPublicationResult(operation.publicationOperationId) });
  }

  async retry(request: IncomingMessage, response: ServerResponse, publicationOperationId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.retry");
    const operation = await mediaPublicationOrchestrationService.retryPublication(publicationOperationId);
    sendJson(response, 200, { success: true, publicationOperation: operation, result: await mediaPublicationOrchestrationService.buildPublicationResult(operation.publicationOperationId) });
  }

  async rollback(request: IncomingMessage, response: ServerResponse, publicationOperationId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.rollback");
    const body = await parseJsonBody(request).catch(() => ({})) as { options?: MediaPublicationOptions };
    const operation = await mediaPublicationOrchestrationService.rollbackPublication(publicationOperationId, body.options);
    sendJson(response, 200, { success: true, publicationOperation: operation, result: await mediaPublicationOrchestrationService.buildPublicationResult(operation.publicationOperationId) });
  }

  async cancel(request: IncomingMessage, response: ServerResponse, publicationOperationId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "publication.cancel");
    const operation = await mediaPublicationOrchestrationService.cancelPublication(publicationOperationId);
    sendJson(response, 200, { success: true, publicationOperation: operation });
  }
}

export const adminPublicationController = new AdminPublicationController();
