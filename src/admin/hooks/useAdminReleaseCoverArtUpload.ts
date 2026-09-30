import { useMemo, useState } from "react";
import type { MediaAssetUploadOptions, MediaUploadResult } from "../../models/media";
import { recordReleaseAuditEvent } from "../../services/admin";
import type { AdminReleaseFormState } from "../utils/adminReleaseFormUtils";
import {
  buildCoverArtAssetTitle,
  buildReleaseCoverArtUploadTarget,
  mapCoverArtUploadResultToReleaseFields,
  releaseCoverArtAccept,
  validateReleaseCoverArtReadiness,
} from "../utils/releaseCoverArtUploadUtils";

interface UseAdminReleaseCoverArtUploadOptions {
  state: AdminReleaseFormState;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

const getReleaseAuditIdentity = (state: AdminReleaseFormState) => ({
  entityId: state.releaseId ?? (state.slug || "new-release"),
  entityLabel: state.title || "Untitled release",
  route: state.releaseId ? `/admin/releases/${state.releaseId}/edit` : "/admin/releases/new",
});

export function useAdminReleaseCoverArtUpload({ state, updateField }: UseAdminReleaseCoverArtUploadOptions) {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [lastUploadResult, setLastUploadResult] = useState<MediaUploadResult | null>(null);
  const [wasReplaced, setWasReplaced] = useState(false);
  const uploadTarget = useMemo(() => buildReleaseCoverArtUploadTarget(state), [state]);
  const readinessWarnings = useMemo(() => validateReleaseCoverArtReadiness(state), [state]);

  const uploadOptions: MediaAssetUploadOptions = useMemo(() => ({
    status: "draft",
    accessLevel: "public",
    title: buildCoverArtAssetTitle(state.title),
    description: state.title.trim() ? `Cover art for ${state.title.trim()}` : "Cover art for a release draft.",
    altText: state.coverArtAlt.trim() || (state.title.trim() ? `${state.title.trim()} cover art` : undefined),
    metadata: {
      releaseId: state.releaseId ?? null,
      intendedUse: "release_cover_art",
      pendingReleaseFormUpload: !state.releaseId,
      coverArtAlt: state.coverArtAlt.trim() || null,
    },
  }), [state.coverArtAlt, state.releaseId, state.title]);

  const handleUploadStart = () => {
    setUploadErrors([]);
    setUploadWarnings([]);
    recordReleaseAuditEvent({
      actionType: "upload",
      ...getReleaseAuditIdentity(state),
      summary: `Started cover art upload for release "${state.title || "Untitled release"}"`,
    });
  };

  const handleUploadSuccess = (result: MediaUploadResult) => {
    setLastUploadResult(result);
    setUploadErrors([]);
    setUploadWarnings(result.warnings ?? []);
    const patch = mapCoverArtUploadResultToReleaseFields(result, state);
    if (!patch) {
      setUploadErrors(["Upload succeeded, but no usable cover art URL was returned."]);
      return;
    }

    const replacingExisting = Boolean(state.coverArtUrl.trim() && state.coverArtAssetId.trim() && state.coverArtAssetId !== patch.coverArtAssetId);
    setWasReplaced(replacingExisting);
    Object.entries(patch).forEach(([field, value]) => {
      updateField(field as keyof AdminReleaseFormState, value as never);
    });

    recordReleaseAuditEvent({
      actionType: replacingExisting ? "replace" : "upload",
      ...getReleaseAuditIdentity(state),
      summary: `${replacingExisting ? "Replaced" : "Uploaded"} cover art for release "${state.title || "Untitled release"}"`,
      metadata: {
        coverArtAssetId: patch.coverArtAssetId || null,
        coverArtStorageObjectId: patch.coverArtStorageObjectId || null,
        pendingAssignment: patch.pendingCoverArtAssignment,
      },
    });
  };

  const handleUploadError = (errors: string[]) => {
    const nextErrors = errors.length ? errors : ["Cover art upload failed."];
    setUploadErrors(nextErrors);
    recordReleaseAuditEvent({
      actionType: "upload",
      ...getReleaseAuditIdentity(state),
      summary: `Cover art upload failed for release "${state.title || "Untitled release"}"`,
      metadata: { errors: nextErrors },
    });
  };

  const clearCoverArt = () => {
    const previousIds = new Set(state.previousCoverArtAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
    if (state.coverArtAssetId.trim()) previousIds.add(state.coverArtAssetId.trim());
    updateField("coverArtUrl", "");
    updateField("coverArtThumbnailUrl", "");
    updateField("coverArtLargeUrl", "");
    updateField("coverArtAssetId", "");
    updateField("coverArtStorageObjectId", "");
    updateField("pendingCoverArtAssignment", false);
    updateField("previousCoverArtAssetIdsInput", [...previousIds].join(", "));
    setLastUploadResult(null);
    setWasReplaced(false);
    setUploadWarnings(["Cover art fields were cleared. The linked media asset remains in the media library unless archived separately."]);
    recordReleaseAuditEvent({
      actionType: "update",
      ...getReleaseAuditIdentity(state),
      summary: `Cleared cover art for release "${state.title || "Untitled release"}"`,
    });
  };

  return {
    accept: releaseCoverArtAccept,
    uploadTarget,
    uploadOptions,
    uploadErrors,
    uploadWarnings,
    lastUploadResult,
    readinessWarnings,
    wasReplaced,
    setUploadErrors,
    setUploadWarnings,
    handleUploadStart,
    handleUploadSuccess,
    handleUploadError,
    clearCoverArt,
  };
}
