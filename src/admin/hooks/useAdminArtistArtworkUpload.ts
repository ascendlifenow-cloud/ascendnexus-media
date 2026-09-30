import { useMemo, useState } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import type { MediaAssetUploadOptions, MediaUploadResult } from "../../models/media";
import { recordArtistAuditEvent } from "../../services/admin";
import type { AdminArtistFormState } from "../utils/adminArtistFormUtils";
import {
  artistArtworkAccept,
  buildArtistArtworkAssetTitle,
  buildArtistArtworkUploadTarget,
  getArtistArtworkLabel,
  mapArtistArtworkAssetToArtistFields,
  mapArtistArtworkUploadResultToArtistFields,
  validateArtistArtworkReadiness,
  type ArtistArtworkUploadKind,
} from "../utils/artistArtworkUploadUtils";

interface UseAdminArtistArtworkUploadOptions {
  state: AdminArtistFormState;
  updateField: <K extends keyof AdminArtistFormState>(field: K, value: AdminArtistFormState[K]) => void;
}

const artworkKinds: ArtistArtworkUploadKind[] = ["profileImage", "thumbnailImage", "characterArt", "bannerImage"];

const getArtistAuditIdentity = (state: AdminArtistFormState) => ({
  entityId: state.artistId ?? (state.slug || "new-artist"),
  entityLabel: state.displayName || state.name || "Untitled artist",
  route: state.artistId ? `/admin/artists/${state.artistId}/edit` : "/admin/artists/new",
});

const getCurrentAssetId = (state: AdminArtistFormState, kind: ArtistArtworkUploadKind): string => {
  if (kind === "profileImage") return state.profileImageAssetId;
  if (kind === "thumbnailImage") return state.profileThumbnailAssetId;
  if (kind === "characterArt") return state.characterArtAssetId;
  return state.profileBannerAssetId;
};

export function useAdminArtistArtworkUpload({ state, updateField }: UseAdminArtistArtworkUploadOptions) {
  const [uploadErrors, setUploadErrors] = useState<Record<ArtistArtworkUploadKind, string[]>>({
    profileImage: [],
    thumbnailImage: [],
    characterArt: [],
    bannerImage: [],
  });
  const [uploadWarnings, setUploadWarnings] = useState<Record<ArtistArtworkUploadKind, string[]>>({
    profileImage: [],
    thumbnailImage: [],
    characterArt: [],
    bannerImage: [],
  });
  const [replaced, setReplaced] = useState<Record<ArtistArtworkUploadKind, boolean>>({
    profileImage: false,
    thumbnailImage: false,
    characterArt: false,
    bannerImage: false,
  });

  const uploadTargets = useMemo(
    () => ({
      profileImage: buildArtistArtworkUploadTarget(state, "profileImage"),
      thumbnailImage: buildArtistArtworkUploadTarget(state, "thumbnailImage"),
      characterArt: buildArtistArtworkUploadTarget(state, "characterArt"),
      bannerImage: buildArtistArtworkUploadTarget(state, "bannerImage"),
    }),
    [state],
  );
  const readinessWarnings = useMemo(() => validateArtistArtworkReadiness(state), [state]);

  const buildUploadOptions = (kind: ArtistArtworkUploadKind): MediaAssetUploadOptions => ({
        status: "draft",
        accessLevel: "admin_only",
        title: buildArtistArtworkAssetTitle(state.displayName || state.name, kind),
        description: `Visual asset for ${state.displayName || state.name || "an artist draft"}.`,
        metadata: {
          artistId: state.artistId ?? null,
          intendedUse: uploadTargets[kind].intendedUse,
          pendingArtistFormUpload: !state.artistId,
          artworkKind: kind,
        },
  });

  const uploadOptions = useMemo(
    () => ({
      profileImage: buildUploadOptions("profileImage"),
      thumbnailImage: buildUploadOptions("thumbnailImage"),
      characterArt: buildUploadOptions("characterArt"),
      bannerImage: buildUploadOptions("bannerImage"),
    }),
    [state.artistId, state.displayName, state.name, uploadTargets],
  );

  const setKindErrors = (kind: ArtistArtworkUploadKind, errors: string[]) =>
    setUploadErrors((current) => ({ ...current, [kind]: errors }));

  const setKindWarnings = (kind: ArtistArtworkUploadKind, warnings: string[]) =>
    setUploadWarnings((current) => ({ ...current, [kind]: warnings }));

  const handleUploadStart = (kind: ArtistArtworkUploadKind) => {
    setKindErrors(kind, []);
    setKindWarnings(kind, []);
    recordArtistAuditEvent({
      actionType: "upload",
      ...getArtistAuditIdentity(state),
      summary: `Started ${getArtistArtworkLabel(kind).toLowerCase()} upload for artist "${state.displayName || state.name || "Untitled artist"}"`,
    });
  };

  const handleUploadSuccess = (kind: ArtistArtworkUploadKind, result: MediaUploadResult) => {
    setKindErrors(kind, []);
    setKindWarnings(kind, result.warnings ?? []);
    const patch = mapArtistArtworkUploadResultToArtistFields(result, state, kind);
    if (!patch) {
      setKindErrors(kind, [`Upload succeeded, but no usable ${getArtistArtworkLabel(kind).toLowerCase()} URL was returned.`]);
      return;
    }

    const wasReplacement = Boolean(getCurrentAssetId(state, kind).trim() && getCurrentAssetId(state, kind) !== result.mediaAsset?.assetId);
    setReplaced((current) => ({ ...current, [kind]: wasReplacement }));
    Object.entries(patch).forEach(([field, value]) => {
      updateField(field as keyof AdminArtistFormState, value as never);
    });

    recordArtistAuditEvent({
      actionType: wasReplacement ? "replace" : "upload",
      ...getArtistAuditIdentity(state),
      summary: `${wasReplacement ? "Replaced" : "Uploaded"} ${getArtistArtworkLabel(kind).toLowerCase()} for artist "${state.displayName || state.name || "Untitled artist"}"`,
      metadata: {
        artworkKind: kind,
        assetId: result.mediaAsset?.assetId ?? null,
        storageObjectId: result.storageObject?.storageObjectId ?? result.storageObjectId ?? null,
        pendingAssignment: !state.artistId,
      },
    });
  };

  const handleUploadError = (kind: ArtistArtworkUploadKind, errors: string[]) => {
    const nextErrors = errors.length ? errors : [`${getArtistArtworkLabel(kind)} upload failed.`];
    setKindErrors(kind, nextErrors);
    recordArtistAuditEvent({
      actionType: "upload",
      ...getArtistAuditIdentity(state),
      summary: `${getArtistArtworkLabel(kind)} upload failed for artist "${state.displayName || state.name || "Untitled artist"}"`,
      metadata: { artworkKind: kind, errors: nextErrors },
    });
  };

  const selectExistingArtwork = (kind: ArtistArtworkUploadKind, asset: MediaAssetRecord) => {
    setKindErrors(kind, []);
    const patch = mapArtistArtworkAssetToArtistFields(asset, state, kind);
    if (!patch) {
      setKindErrors(kind, [`Selected media asset does not have a usable ${getArtistArtworkLabel(kind).toLowerCase()} URL.`]);
      return;
    }
    const wasReplacement = Boolean(getCurrentAssetId(state, kind).trim() && getCurrentAssetId(state, kind) !== asset.assetId);
    setReplaced((current) => ({ ...current, [kind]: wasReplacement }));
    Object.entries(patch).forEach(([field, value]) => {
      updateField(field as keyof AdminArtistFormState, value as never);
    });
    setKindWarnings(kind, [`Selected existing media asset "${asset.title}". Save the artist to persist this ${getArtistArtworkLabel(kind).toLowerCase()} link.`]);
    recordArtistAuditEvent({
      actionType: wasReplacement ? "replace" : "update",
      ...getArtistAuditIdentity(state),
      summary: `${wasReplacement ? "Replaced" : "Selected"} ${getArtistArtworkLabel(kind).toLowerCase()} from media library for artist "${state.displayName || state.name || "Untitled artist"}"`,
      metadata: {
        artworkKind: kind,
        assetId: asset.assetId,
        storageObjectId: typeof asset.metadata?.storageObjectId === "string" ? asset.metadata.storageObjectId : null,
        pendingAssignment: !state.artistId,
      },
    });
  };

  const clearArtwork = (kind: ArtistArtworkUploadKind) => {
    const previousIds = new Set(state.previousArtistImageAssetIdsInput.split(",").map((item) => item.trim()).filter(Boolean));
    const currentAssetId = getCurrentAssetId(state, kind).trim();
    if (currentAssetId) previousIds.add(currentAssetId);
    const fieldMap: Record<ArtistArtworkUploadKind, Array<keyof AdminArtistFormState>> = {
      profileImage: ["profileImage", "profileImageAssetId", "profileImageStorageObjectId"],
      thumbnailImage: ["profileThumbnailUrl", "profileThumbnailAssetId", "profileThumbnailStorageObjectId"],
      characterArt: ["characterArtUrl", "characterArtAssetId", "characterArtStorageObjectId"],
      bannerImage: ["profileBannerUrl", "profileBannerAssetId", "profileBannerStorageObjectId"],
    };
    fieldMap[kind].forEach((field) => updateField(field, "" as never));
    updateField("pendingArtistArtworkAssignment", false);
    updateField("previousArtistImageAssetIdsInput", [...previousIds].join(", "));
    setReplaced((current) => ({ ...current, [kind]: false }));
    setKindWarnings(kind, [`${getArtistArtworkLabel(kind)} fields were cleared. The linked media asset remains in the media library unless archived separately.`]);
    recordArtistAuditEvent({
      actionType: "update",
      ...getArtistAuditIdentity(state),
      summary: `Cleared ${getArtistArtworkLabel(kind).toLowerCase()} for artist "${state.displayName || state.name || "Untitled artist"}"`,
    });
  };

  return {
    accept: artistArtworkAccept,
    uploadTargets,
    uploadOptions,
    uploadErrors,
    uploadWarnings,
    readinessWarnings,
    replaced,
    handleUploadStart,
    handleUploadSuccess,
    handleUploadError,
    selectExistingArtwork,
    clearArtwork,
  };
}
