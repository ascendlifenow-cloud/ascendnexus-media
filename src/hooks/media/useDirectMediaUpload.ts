import { useCallback, useMemo, useRef, useState } from "react";
import type { DirectUploadSessionResponse, MediaUploadResult, MediaUploadTarget } from "../../models/media";
import { directMediaUploadService } from "../../services/media/DirectMediaUploadService";

export const useDirectMediaUpload = () => {
  const [session, setSession] = useState<DirectUploadSessionResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [partProgress, setPartProgress] = useState<Record<number, number>>({});
  const [result, setResult] = useState<MediaUploadResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [paused, setPaused] = useState(false);

  const uploadFile = useCallback(async (file: File, uploadTarget: MediaUploadTarget) => {
    abortRef.current = new AbortController();
    setResult(null);
    setErrors([]);
    setProgress(0);
    const nextSession = await directMediaUploadService.createUploadSession(file, uploadTarget);
    setSession(nextSession);
    if (!nextSession.success || nextSession.uploadStrategy === "backend_proxy") return nextSession as unknown as MediaUploadResult;
    const uploadResult = await directMediaUploadService.uploadFile(file, nextSession, {
      signal: abortRef.current.signal,
      onProgress: setProgress,
      onPartProgress: (partNumber, value) => setPartProgress((items) => ({ ...items, [partNumber]: value })),
    });
    setResult(uploadResult);
    if (!uploadResult.success) setErrors(uploadResult.errors ?? ["Direct upload failed."]);
    return uploadResult;
  }, []);

  const pauseUpload = useCallback(() => {
    setPaused(true);
    return session?.uploadSessionId ? directMediaUploadService.pauseUpload(session.uploadSessionId) : { success: false };
  }, [session?.uploadSessionId]);

  const resumeUpload = useCallback(async () => {
    if (!session?.uploadSessionId) return null;
    setPaused(false);
    const refreshed = await directMediaUploadService.resumeUpload(session.uploadSessionId);
    setSession(refreshed);
    return refreshed;
  }, [session?.uploadSessionId]);

  const cancelUpload = useCallback(async () => {
    abortRef.current?.abort();
    if (!session?.uploadSessionId) return null;
    const canceled = await directMediaUploadService.cancelUpload(session.uploadSessionId);
    setErrors(canceled.errors ?? []);
    return canceled;
  }, [session?.uploadSessionId]);

  const isUploading = useMemo(() => Boolean(session && !result && !paused), [paused, result, session]);

  return {
    session,
    progress,
    partProgress,
    result,
    errors,
    isUploading,
    paused,
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
  };
};
