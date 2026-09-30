import { useMemo, useState } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import type { MediaAssetUploadOptions, MediaUploadResult } from "../../models/media";
import { recordReleaseAuditEvent } from "../../services/admin";
import type { AdminReleaseFormState } from "../utils/adminReleaseFormUtils";
import { generateAudioPreviewFromFullSong } from "../services/AdminAudioPreviewGenerationService";
import {
  buildAudioAssetTitle,
  buildReleaseAudioUploadTarget,
  buildReleaseFullSongUploadTarget,
  mapAudioUploadResultToReleaseFields,
  mapAudioAssetToReleaseFields,
  releaseAudioAccept,
  validateReleaseAudioReadiness,
  type ReleaseAudioUploadKind,
} from "../utils/releaseAudioUploadUtils";

interface UseAdminReleaseAudioUploadOptions {
  state: AdminReleaseFormState;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

const getReleaseAuditIdentity = (state: AdminReleaseFormState) => ({
  entityId: state.releaseId ?? (state.slug || "new-release"),
  entityLabel: state.title || "Untitled release",
  route: state.releaseId ? `/admin/releases/${state.releaseId}/edit` : "/admin/releases/new",
});

const getKindLabel = (kind: ReleaseAudioUploadKind) => kind === "audioPreview" ? "audio preview" : "full song audio";

export function useAdminReleaseAudioUpload({ state, updateField }: UseAdminReleaseAudioUploadOptions) {
  const [uploadErrors, setUploadErrors] = useState<Record<ReleaseAudioUploadKind, string[]>>({ audioPreview: [], fullSong: [] });
  const [uploadWarnings, setUploadWarnings] = useState<Record<ReleaseAudioUploadKind, string[]>>({ audioPreview: [], fullSong: [] });
  const [lastUploadResult, setLastUploadResult] = useState<Record<ReleaseAudioUploadKind, MediaUploadResult | null>>({ audioPreview: null, fullSong: null });
  const [replaced, setReplaced] = useState<Record<ReleaseAudioUploadKind, boolean>>({ audioPreview: false, fullSong: false });
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const audioPreviewTarget = useMemo(() => buildReleaseAudioUploadTarget(state, "audioPreview"), [state]);
  const fullSongTarget = useMemo(() => buildReleaseFullSongUploadTarget(state), [state]);
  const readinessWarnings = useMemo(() => validateReleaseAudioReadiness(state), [state]);

  const audioPreviewOptions: MediaAssetUploadOptions = useMemo(() => ({
    status: "draft",
    accessLevel: "admin_only",
    title: buildAudioAssetTitle(state.title, "audioPreview"),
    description: state.title.trim() ? `Audio preview for ${state.title.trim()}` : "Audio preview for a release draft.",
    metadata: {
      releaseId: state.releaseId ?? null,
      intendedUse: "release_audio_preview",
      pendingReleaseFormUpload: !state.releaseId,
      waveformReady: false,
    },
  }), [state.releaseId, state.title]);

  const fullSongOptions: MediaAssetUploadOptions = useMemo(() => ({
    status: "draft",
    accessLevel: "admin_only",
    title: buildAudioAssetTitle(state.title, "fullSong"),
    description: state.title.trim() ? `Full song audio file for ${state.title.trim()}` : "Full song audio file for a release draft.",
    metadata: {
      releaseId: state.releaseId ?? null,
      intendedUse: "release_full_song",
      pendingReleaseFormUpload: !state.releaseId,
      publicPlaybackAllowed: false,
      waveformReady: false,
    },
  }), [state.releaseId, state.title]);

  const setKindErrors = (kind: ReleaseAudioUploadKind, errors: string[]) =>
    setUploadErrors((current) => ({ ...current, [kind]: errors }));

  const setKindWarnings = (kind: ReleaseAudioUploadKind, warnings: string[]) =>
    setUploadWarnings((current) => ({ ...current, [kind]: warnings }));

  const handleUploadStart = (kind: ReleaseAudioUploadKind) => {
    setKindErrors(kind, []);
    setKindWarnings(kind, []);
    recordReleaseAuditEvent({
      actionType: "upload",
      ...getReleaseAuditIdentity(state),
      summary: `Started ${getKindLabel(kind)} upload for release "${state.title || "Untitled release"}"`,
    });
  };

  const handleUploadSuccess = (kind: ReleaseAudioUploadKind, result: MediaUploadResult) => {
    setLastUploadResult((current) => ({ ...current, [kind]: result }));
    setKindErrors(kind, []);
    setKindWarnings(kind, result.warnings ?? []);
    const patch = mapAudioUploadResultToReleaseFields(result, state, kind);
    if (!patch) {
      setKindErrors(kind, [`Upload succeeded, but no usable ${getKindLabel(kind)} URL was returned.`]);
      return;
    }

    const wasReplacement = kind === "audioPreview"
      ? Boolean(state.audioPreviewUrl.trim() && state.audioPreviewAssetId.trim() && state.audioPreviewAssetId !== patch.audioPreviewAssetId)
      : Boolean(state.fullSongAssetId.trim() && state.fullSongAssetId !== patch.fullSongAssetId);

    setReplaced((current) => ({ ...current, [kind]: wasReplacement }));
    Object.entries(patch).forEach(([field, value]) => {
      updateField(field as keyof AdminReleaseFormState, value as never);
    });

    recordReleaseAuditEvent({
      actionType: wasReplacement ? "replace" : "upload",
      ...getReleaseAuditIdentity(state),
      summary: `${wasReplacement ? "Replaced" : "Uploaded"} ${getKindLabel(kind)} for release "${state.title || "Untitled release"}"`,
      metadata: {
        audioKind: kind,
        audioAssetId: kind === "audioPreview" ? patch.audioPreviewAssetId ?? null : patch.fullSongAssetId ?? null,
        storageObjectId: kind === "audioPreview" ? patch.audioPreviewStorageObjectId ?? null : patch.fullSongStorageObjectId ?? null,
        pendingAssignment: kind === "audioPreview" ? patch.pendingAudioPreviewAssignment ?? false : patch.pendingFullSongAssignment ?? false,
        publicPlaybackAllowed: kind === "fullSong" ? false : null,
      },
    });
  };

  const handleUploadError = (kind: ReleaseAudioUploadKind, errors: string[]) => {
    const nextErrors = errors.length ? errors : [`${getKindLabel(kind)} upload failed.`];
    setKindErrors(kind, nextErrors);
    recordReleaseAuditEvent({
      actionType: "upload",
      ...getReleaseAuditIdentity(state),
      summary: `${getKindLabel(kind)} upload failed for release "${state.title || "Untitled release"}"`,
      metadata: { audioKind: kind, errors: nextErrors },
    });
  };

  const selectExistingAudioAsset = (kind: ReleaseAudioUploadKind, asset: MediaAssetRecord) => {
    setLastUploadResult((current) => ({ ...current, [kind]: null }));
    setKindErrors(kind, []);
    const patch = mapAudioAssetToReleaseFields(asset, state, kind);
    if (!patch) {
      setKindErrors(kind, [`Selected media asset does not have a usable ${getKindLabel(kind)} URL.`]);
      return;
    }
    const wasReplacement = kind === "audioPreview"
      ? Boolean(state.audioPreviewUrl.trim() && state.audioPreviewAssetId.trim() && state.audioPreviewAssetId !== patch.audioPreviewAssetId)
      : Boolean(state.fullSongAssetId.trim() && state.fullSongAssetId !== patch.fullSongAssetId);

    setReplaced((current) => ({ ...current, [kind]: wasReplacement }));
    Object.entries(patch).forEach(([field, value]) => {
      updateField(field as keyof AdminReleaseFormState, value as never);
    });
    setKindWarnings(kind, [`Selected existing media asset "${asset.title}". Save the release to persist this ${getKindLabel(kind)} link.`]);
    recordReleaseAuditEvent({
      actionType: wasReplacement ? "replace" : "update",
      ...getReleaseAuditIdentity(state),
      summary: `${wasReplacement ? "Replaced" : "Selected"} ${getKindLabel(kind)} from media library for release "${state.title || "Untitled release"}"`,
      metadata: {
        audioKind: kind,
        audioAssetId: asset.assetId,
        storageObjectId: typeof asset.metadata?.storageObjectId === "string" ? asset.metadata.storageObjectId : null,
        pendingAssignment: kind === "audioPreview" ? patch.pendingAudioPreviewAssignment ?? false : patch.pendingFullSongAssignment ?? false,
        publicPlaybackAllowed: kind === "fullSong" ? false : null,
      },
    });
  };

  const clearAudioPreview = () => {
    const previousIds = new Set(state.previousAudioPreviewAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
    if (state.audioPreviewAssetId.trim()) previousIds.add(state.audioPreviewAssetId.trim());
    updateField("audioPreviewUrl", "");
    updateField("audioPreviewAssetId", "");
    updateField("audioPreviewStorageObjectId", "");
    updateField("audioPreviewOriginalFileName", "");
    updateField("audioPreviewDuration", "");
    updateField("audioPreviewFileSizeBytes", "");
    updateField("audioPreviewMimeType", "");
    updateField("pendingAudioPreviewAssignment", false);
    updateField("previousAudioPreviewAssetIdsInput", [...previousIds].join(", "));
    setLastUploadResult((current) => ({ ...current, audioPreview: null }));
    setReplaced((current) => ({ ...current, audioPreview: false }));
    setKindWarnings("audioPreview", ["Audio preview fields were cleared. The linked media asset remains in the media library unless archived separately."]);
    recordReleaseAuditEvent({
      actionType: "update",
      ...getReleaseAuditIdentity(state),
      summary: `Cleared audio preview for release "${state.title || "Untitled release"}"`,
    });
  };

  const generatePreviewFromFullSong = async () => {
    const fullSongAssetId = state.fullSongAssetId.trim();
    if (!fullSongAssetId) {
      setKindErrors("audioPreview", ["Upload or save a full song asset before generating a 30-second preview."]);
      return;
    }
    setGeneratingPreview(true);
    setKindErrors("audioPreview", []);
    setKindWarnings("audioPreview", ["Generating a 30-second preview from the private full song asset."]);
    try {
      const result = await generateAudioPreviewFromFullSong(fullSongAssetId, {
        durationSeconds: 30,
        startSeconds: 0,
        title: buildAudioAssetTitle(state.title, "audioPreview"),
      });
      setLastUploadResult((current) => ({ ...current, audioPreview: result }));
      const patch = mapAudioUploadResultToReleaseFields(result, state, "audioPreview");
      if (!patch) {
        setKindErrors("audioPreview", ["Preview was generated, but no usable audio preview URL was returned."]);
        return;
      }
      const wasReplacement = Boolean(state.audioPreviewUrl.trim() && state.audioPreviewAssetId.trim() && state.audioPreviewAssetId !== patch.audioPreviewAssetId);
      setReplaced((current) => ({ ...current, audioPreview: wasReplacement }));
      Object.entries(patch).forEach(([field, value]) => {
        updateField(field as keyof AdminReleaseFormState, value as never);
      });
      setKindWarnings("audioPreview", ["Generated a 30-second audio preview from the full song. Save the release to persist this preview link."]);
      recordReleaseAuditEvent({
        actionType: wasReplacement ? "replace" : "upload",
        ...getReleaseAuditIdentity(state),
        summary: `${wasReplacement ? "Replaced" : "Generated"} audio preview from full song for release "${state.title || "Untitled release"}"`,
        metadata: {
          sourceFullSongAssetId: fullSongAssetId,
          audioPreviewAssetId: patch.audioPreviewAssetId ?? null,
          audioPreviewStorageObjectId: patch.audioPreviewStorageObjectId ?? null,
          generatedDurationSeconds: 30,
        },
      });
    } catch (error) {
      setKindErrors("audioPreview", [error instanceof Error ? error.message : "Audio preview generation failed."]);
    } finally {
      setGeneratingPreview(false);
    }
  };

  return {
    accept: releaseAudioAccept,
    audioPreviewTarget,
    fullSongTarget,
    audioPreviewOptions,
    fullSongOptions,
    uploadErrors,
    uploadWarnings,
    lastUploadResult,
    readinessWarnings,
    replaced,
    generatingPreview,
    handleAudioPreviewUploadStart: () => handleUploadStart("audioPreview"),
    handleAudioPreviewUploadSuccess: (result: MediaUploadResult) => handleUploadSuccess("audioPreview", result),
    handleAudioPreviewUploadError: (errors: string[]) => handleUploadError("audioPreview", errors),
    handleFullSongUploadStart: () => handleUploadStart("fullSong"),
    handleFullSongUploadSuccess: (result: MediaUploadResult) => handleUploadSuccess("fullSong", result),
    handleFullSongUploadError: (errors: string[]) => handleUploadError("fullSong", errors),
    selectExistingAudioAsset,
    generatePreviewFromFullSong,
    clearAudioPreview,
  };
}
