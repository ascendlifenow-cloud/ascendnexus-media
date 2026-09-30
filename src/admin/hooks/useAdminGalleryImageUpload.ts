import { useMemo, useState } from "react";
import type { MediaAssetUploadOptions, MediaUploadResult } from "../../models/media";
import { recordGalleryAuditEvent } from "../../services/admin";
import type { AdminGalleryFormState } from "../utils/adminGalleryFormUtils";
import {
  buildGalleryImageAssetTitle,
  buildGalleryImageUploadTarget,
  galleryImageAccept,
  mapGalleryUploadResultToGalleryFields,
  validateGalleryImageReadiness,
} from "../utils/galleryImageUploadUtils";

interface UseAdminGalleryImageUploadOptions {
  state: AdminGalleryFormState;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

const getGalleryAuditIdentity = (state: AdminGalleryFormState) => ({
  entityId: state.galleryItemId ?? (state.slug || "new-gallery-item"),
  entityLabel: state.title || "Untitled gallery item",
  route: state.galleryItemId ? `/admin/gallery/${state.galleryItemId}/edit` : "/admin/gallery/new",
});

export function useAdminGalleryImageUpload({ state, updateField }: UseAdminGalleryImageUploadOptions) {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [wasReplaced, setWasReplaced] = useState(false);
  const uploadTarget = useMemo(() => buildGalleryImageUploadTarget(state), [state]);
  const readinessWarnings = useMemo(() => validateGalleryImageReadiness(state), [state]);

  const uploadOptions: MediaAssetUploadOptions = useMemo(() => ({
    status: "draft",
    accessLevel: "admin_only",
    title: buildGalleryImageAssetTitle(state.title),
    description: state.title.trim() ? `Gallery visual for ${state.title.trim()}` : "Gallery visual for a draft gallery item.",
    altText: state.altText.trim() || (state.title.trim() ? `${state.title.trim()} gallery image` : undefined),
    metadata: {
      galleryItemId: state.galleryItemId ?? null,
      mediaType: state.mediaType,
      sourceType: state.sourceType,
      sourceId: state.sourceId.trim() || null,
      intendedUse: uploadTarget.intendedUse,
      pendingGalleryFormUpload: !state.galleryItemId,
    },
  }), [state.altText, state.galleryItemId, state.mediaType, state.sourceId, state.sourceType, state.title, uploadTarget.intendedUse]);

  const handleUploadStart = () => {
    setUploadErrors([]);
    setUploadWarnings([]);
    recordGalleryAuditEvent({
      actionType: "upload",
      ...getGalleryAuditIdentity(state),
      summary: `Started gallery image upload for "${state.title || "Untitled gallery item"}"`,
    });
  };

  const handleUploadSuccess = (result: MediaUploadResult) => {
    setUploadErrors([]);
    setUploadWarnings(result.warnings ?? []);
    const patch = mapGalleryUploadResultToGalleryFields(result, state);
    if (!patch) {
      setUploadErrors(["Upload succeeded, but no usable gallery image URL was returned."]);
      return;
    }
    const replacingExisting = Boolean(state.imageUrl.trim() && state.mediaAssetId.trim() && state.mediaAssetId !== patch.mediaAssetId);
    setWasReplaced(replacingExisting);
    Object.entries(patch).forEach(([field, value]) => {
      if (field === "altText" && state.altText.trim()) return;
      updateField(field as keyof AdminGalleryFormState, value as never);
    });
    recordGalleryAuditEvent({
      actionType: replacingExisting ? "replace" : "upload",
      ...getGalleryAuditIdentity(state),
      summary: `${replacingExisting ? "Replaced" : "Uploaded"} gallery image for "${state.title || "Untitled gallery item"}"`,
      metadata: {
        mediaAssetId: patch.mediaAssetId || null,
        storageObjectId: patch.storageObjectId || null,
        mediaType: state.mediaType,
        sourceType: state.sourceType,
        sourceId: state.sourceId || null,
        pendingAssignment: patch.pendingGalleryAssignment,
      },
    });
  };

  const handleUploadError = (errors: string[]) => {
    const nextErrors = errors.length ? errors : ["Gallery image upload failed."];
    setUploadErrors(nextErrors);
    recordGalleryAuditEvent({
      actionType: "upload",
      ...getGalleryAuditIdentity(state),
      summary: `Gallery image upload failed for "${state.title || "Untitled gallery item"}"`,
      metadata: { errors: nextErrors },
    });
  };

  const clearGalleryImage = () => {
    const previousIds = new Set(state.previousGalleryAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
    if (state.mediaAssetId.trim()) previousIds.add(state.mediaAssetId.trim());
    updateField("imageUrl", "");
    updateField("thumbnailUrl", "");
    updateField("mediaAssetId", "");
    updateField("storageObjectId", "");
    updateField("originalFileName", "");
    updateField("pendingGalleryAssignment", false);
    updateField("previousGalleryAssetIdsInput", [...previousIds].join(", "));
    setWasReplaced(false);
    setUploadWarnings(["Gallery image fields were cleared. The linked media asset remains in the media library unless archived separately."]);
    recordGalleryAuditEvent({
      actionType: "update",
      ...getGalleryAuditIdentity(state),
      summary: `Cleared gallery image for "${state.title || "Untitled gallery item"}"`,
    });
  };

  return {
    accept: galleryImageAccept,
    uploadTarget,
    uploadOptions,
    uploadErrors,
    uploadWarnings,
    readinessWarnings,
    wasReplaced,
    handleUploadStart,
    handleUploadSuccess,
    handleUploadError,
    clearGalleryImage,
  };
}
