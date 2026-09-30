import { useCallback, useState } from "react";
import type { MediaPublicationEntityType, MediaPublicationOperation, MediaPublicationOptions, MediaPublicationResult } from "../../models/publication";
import { adminMediaPublicationService } from "../services/AdminMediaPublicationService";
import { useEntityPublicationReadiness } from "./useEntityPublicationReadiness";

export const useMediaPublication = (entityType: MediaPublicationEntityType | undefined, entityId: string | undefined) => {
  const readiness = useEntityPublicationReadiness(entityType, entityId);
  const [operation, setOperation] = useState<MediaPublicationOperation | undefined>();
  const [result, setResult] = useState<MediaPublicationResult | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (action: "publish" | "unpublish" | "archive" | "restore", options?: MediaPublicationOptions) => {
    if (!entityType || !entityId) return;
    setBusy(true);
    const response =
      action === "publish" ? await adminMediaPublicationService.publishEntity(entityType, entityId, options) :
      action === "unpublish" ? await adminMediaPublicationService.unpublishEntity(entityType, entityId, options) :
      action === "archive" ? await adminMediaPublicationService.archiveEntity(entityType, entityId, options) :
      await adminMediaPublicationService.restoreEntity(entityType, entityId, options);
    setOperation(response.publicationOperation);
    setResult(response.result);
    setErrors(response.errors ?? []);
    await readiness.refresh();
    setBusy(false);
  }, [entityType, entityId, readiness]);

  const retry = useCallback(async () => {
    if (!operation) return;
    setBusy(true);
    const response = await adminMediaPublicationService.retryPublication(operation.publicationOperationId);
    setOperation(response.publicationOperation);
    setResult(response.result);
    setErrors(response.errors ?? []);
    setBusy(false);
  }, [operation]);

  const rollback = useCallback(async () => {
    if (!operation) return;
    setBusy(true);
    const response = await adminMediaPublicationService.rollbackPublication(operation.publicationOperationId);
    setOperation(response.publicationOperation);
    setResult(response.result);
    setErrors(response.errors ?? []);
    setBusy(false);
  }, [operation]);

  const cancel = useCallback(async () => {
    if (!operation) return;
    setBusy(true);
    const response = await adminMediaPublicationService.cancelPublication(operation.publicationOperationId);
    setOperation(response.publicationOperation);
    setErrors(response.errors ?? []);
    setBusy(false);
  }, [operation]);

  return {
    ...readiness,
    operation,
    result,
    errors: [...readiness.errors, ...errors],
    busy,
    publish: (options?: MediaPublicationOptions) => run("publish", options),
    unpublish: (options?: MediaPublicationOptions) => run("unpublish", options),
    archive: (options?: MediaPublicationOptions) => run("archive", options),
    restore: (options?: MediaPublicationOptions) => run("restore", options),
    retry,
    rollback,
    cancel,
  };
};
