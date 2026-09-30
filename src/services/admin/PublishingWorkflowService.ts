import type {
  PublishingAction,
  PublishingActionType,
  PublishingEntityType,
  PublishingStatus,
} from "../../models/admin";
import {
  getAvailablePublishingActions,
  getPublicVisibilityState,
  getPublishingReadinessState,
  getPublishingStatus,
  type PublishingWorkflowContext,
  validatePublishingStatusTransition,
} from "../../admin/utils/publishingWorkflowUtils";
import { createApiSuccess, type ApiResult } from "../api/httpClient";
import { recordPublishingAuditEvent } from "./AdminAuditService";
import { artistPublishingService } from "./ArtistPublishingService";
import { releasePublishingService } from "./ReleasePublishingService";

export interface PublishingWorkflowService {
  getPublishingStatus(entityType: PublishingEntityType, entity: unknown, context?: PublishingWorkflowContext): PublishingStatus;
  getAvailablePublishingActions(entityType: PublishingEntityType, entity: unknown, context?: PublishingWorkflowContext): PublishingAction[];
  validatePublishReadiness(entityType: PublishingEntityType, entity: unknown, context?: PublishingWorkflowContext): PublishingStatus;
  executePublishingAction(
    entityType: PublishingEntityType,
    entityId: string,
    actionType: PublishingActionType,
    payload?: Record<string, unknown>,
  ): Promise<ApiResult<{ entityType: PublishingEntityType; entityId: string; actionType: PublishingActionType }>>;
  getPublicVisibility(entityType: PublishingEntityType, entity: unknown, context?: PublishingWorkflowContext): string;
  validateStatusTransition(entityType: PublishingEntityType, fromStatus: string, toStatus: string): boolean;
}

export class MockPublishingWorkflowService implements PublishingWorkflowService {
  getPublishingStatus(entityType: PublishingEntityType, entity: unknown, context: PublishingWorkflowContext = {}) {
    return getPublishingStatus(entityType, entity, context);
  }

  getAvailablePublishingActions(entityType: PublishingEntityType, entity: unknown, context: PublishingWorkflowContext = {}) {
    return getAvailablePublishingActions(this.getPublishingStatus(entityType, entity, context));
  }

  validatePublishReadiness(entityType: PublishingEntityType, entity: unknown, context: PublishingWorkflowContext = {}) {
    return this.getPublishingStatus(entityType, entity, context);
  }

  async executePublishingAction(entityType: PublishingEntityType, entityId: string, actionType: PublishingActionType) {
    if (entityType === "artist") {
      if (actionType === "activate" || actionType === "publish") {
        const result = await artistPublishingService.activateArtist(entityId);
        if (!result.ok) return result;
      } else if (actionType === "archive") {
        const result = await artistPublishingService.archiveArtist(entityId);
        if (!result.ok) return result;
      } else if (actionType === "restore") {
        const result = await artistPublishingService.restoreArtist(entityId);
        if (!result.ok) return result;
      }
      return createApiSuccess({ entityType, entityId, actionType });
    }
    if (entityType === "release") {
      if (actionType === "publish") {
        const result = await releasePublishingService.publishRelease(entityId);
        if (!result.ok) return result;
      } else if (actionType === "archive") {
        const result = await releasePublishingService.archiveRelease(entityId);
        if (!result.ok) return result;
      } else if (actionType === "restore") {
        const result = await releasePublishingService.restoreRelease(entityId);
        if (!result.ok) return result;
      } else if (actionType === "unpublish") {
        const result = await releasePublishingService.unpublishRelease(entityId);
        if (!result.ok) return result;
      }
      return createApiSuccess({ entityType, entityId, actionType });
    }
    recordPublishingAuditEvent(
      entityType === "gallery_item" || entityType === "homepage_section" || entityType === "seo_metadata" || entityType === "media_asset"
        ? entityType
        : entityType === "site_config"
          ? "site_config"
          : entityType === "custom"
            ? "custom"
            : entityType,
      {
        actionType: actionType === "activate" || actionType === "archive" || actionType === "restore" || actionType === "publish" || actionType === "enable" || actionType === "disable" ? actionType : "custom",
        entityId,
        entityLabel: entityId,
        route: "/admin",
        summary: `${actionType.replace(/_/g, " ")} ${entityType.replace(/_/g, " ")} "${entityId}"`,
      },
    );
    return createApiSuccess({ entityType, entityId, actionType });
  }

  getPublicVisibility(entityType: PublishingEntityType, entity: unknown, context: PublishingWorkflowContext = {}) {
    return getPublicVisibilityState(entityType, entity, context);
  }

  validateStatusTransition(entityType: PublishingEntityType, fromStatus: string, toStatus: string) {
    return validatePublishingStatusTransition(entityType, fromStatus, toStatus);
  }
}

export const publishingWorkflowService = new MockPublishingWorkflowService();
