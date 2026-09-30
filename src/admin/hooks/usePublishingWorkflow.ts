import { useMemo, useState } from "react";
import type { PublishingActionType, PublishingEntityType } from "../../models/admin";
import { publishingWorkflowService } from "../../services/admin/PublishingWorkflowService";
import type { PublishingWorkflowContext } from "../utils/publishingWorkflowUtils";

export function usePublishingWorkflow(
  entityType: PublishingEntityType,
  entity: unknown,
  context: PublishingWorkflowContext = {},
) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publishingStatus = useMemo(
    () => publishingWorkflowService.getPublishingStatus(entityType, entity, context),
    [context, entity, entityType],
  );
  const actions = useMemo(
    () => publishingWorkflowService.getAvailablePublishingActions(entityType, entity, context),
    [context, entity, entityType],
  );

  const executeAction = async (actionType: PublishingActionType) => {
    setIsSaving(true);
    setError(null);
    const result = await publishingWorkflowService.executePublishingAction(
      entityType,
      publishingStatus.entityId,
      actionType,
    );
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return false;
    }
    return true;
  };

  return {
    publishingStatus,
    actions,
    publicVisibility: publishingStatus.publicVisibility,
    readinessState: publishingStatus.readinessState,
    isSaving,
    error,
    executeAction,
  };
}
