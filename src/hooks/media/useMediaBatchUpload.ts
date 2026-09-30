import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import type { MediaBatchUploadOptions, MediaBatchUploadSession } from "../../models/media";
import { mediaBatchUploadService } from "../../services/media";
import { getBatchSessionSummary } from "../../utils/media/batchUploadUtils";

interface UseMediaBatchUploadOptions {
  onAssetUploaded?: (asset: MediaAssetRecord) => void;
  onBatchCompleted?: (session: MediaBatchUploadSession) => void;
}

const getUploadedAssets = (session: MediaBatchUploadSession | null): MediaAssetRecord[] =>
  session?.files.map((file) => file.uploadResult?.mediaAsset).filter((asset): asset is MediaAssetRecord => Boolean(asset)) ?? [];

export function useMediaBatchUpload({ onAssetUploaded, onBatchCompleted }: UseMediaBatchUploadOptions = {}) {
  const [session, setSession] = useState<MediaBatchUploadSession | null>(null);
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => () => unsubscribeRef.current?.(), []);

  const createSession = useCallback((files: File[], options: Partial<MediaBatchUploadOptions> = {}) => {
    setLastError(null);
    unsubscribeRef.current?.();
    const next = mediaBatchUploadService.createBatchSession(files, options);
    setSession(next);
    unsubscribeRef.current = mediaBatchUploadService.subscribe(next.sessionId, setSession);
    return next;
  }, []);

  const validateSession = useCallback(async () => {
    if (!session) return null;
    const next = await mediaBatchUploadService.validateBatchSession(session.sessionId);
    if (next) setSession(next);
    return next;
  }, [session]);

  const startUpload = useCallback(async () => {
    if (!session || running) return null;
    setRunning(true);
    setLastError(null);
    try {
      const beforeAssets = new Set(getUploadedAssets(session).map((asset) => asset.assetId));
      const next = await mediaBatchUploadService.startBatchUpload(session.sessionId);
      if (next) {
        setSession(next);
        getUploadedAssets(next)
          .filter((asset) => !beforeAssets.has(asset.assetId))
          .forEach((asset) => onAssetUploaded?.(asset));
        if (["completed", "completed_with_errors", "failed", "canceled"].includes(next.status)) onBatchCompleted?.(next);
      }
      return next;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Batch upload failed.");
      return null;
    } finally {
      setRunning(false);
    }
  }, [onAssetUploaded, onBatchCompleted, running, session]);

  const retryFailed = useCallback(async () => {
    if (!session || running) return null;
    setRunning(true);
    try {
      const next = await mediaBatchUploadService.retryFailedFiles(session.sessionId);
      if (next) setSession(next);
      return next;
    } finally {
      setRunning(false);
    }
  }, [running, session]);

  const retryFile = useCallback(async (batchFileId: string) => {
    if (!session || running) return null;
    setRunning(true);
    try {
      const next = await mediaBatchUploadService.retryBatchFile(session.sessionId, batchFileId);
      if (next) setSession(next);
      return next;
    } finally {
      setRunning(false);
    }
  }, [running, session]);

  const cancelBatch = useCallback(() => {
    if (!session) return null;
    const next = mediaBatchUploadService.cancelBatch(session.sessionId);
    if (next) setSession(next);
    return next;
  }, [session]);

  const cancelFile = useCallback((batchFileId: string) => {
    if (!session) return null;
    const next = mediaBatchUploadService.cancelBatchFile(session.sessionId, batchFileId);
    if (next) setSession(next);
    return next;
  }, [session]);

  const clearCompleted = useCallback(() => {
    if (!session) return null;
    const next = mediaBatchUploadService.clearCompleted(session.sessionId);
    if (next) setSession(next);
    return next;
  }, [session]);

  const summary = useMemo(() => session ? getBatchSessionSummary(session) : null, [session]);

  return {
    session,
    summary,
    running,
    lastError,
    createSession,
    validateSession,
    startUpload,
    retryFailed,
    retryFile,
    cancelBatch,
    cancelFile,
    clearCompleted,
    uploadedAssets: getUploadedAssets(session),
  };
}
