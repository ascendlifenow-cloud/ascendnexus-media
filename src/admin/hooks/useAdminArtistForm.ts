import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminArtist,
  useCreateAdminArtist,
  useUpdateAdminArtist,
} from "../../hooks/admin/useAdminContent";
import type { AdminArtistFormState } from "../utils/adminArtistFormUtils";
import { adminMediaService } from "../../services/admin";
import {
  createEmptyArtistFormState,
  mapArtistToFormState,
  slugifyArtistValue,
  toCreateArtistDto,
  toUpdateArtistDto,
  validateArtistForm,
} from "../utils/adminArtistFormUtils";
import {
  isArtistPublicDeliveryMediaUrl,
  mapArtistArtworkAssetToArtistFields,
  type ArtistArtworkUploadKind,
} from "../utils/artistArtworkUploadUtils";

export function useAdminArtistForm(artistId?: string) {
  const navigate = useNavigate();
  const isEditMode = Boolean(artistId);
  const artistQuery = useAdminArtist(artistId);
  const createArtist = useCreateAdminArtist();
  const updateArtist = useUpdateAdminArtist();
  const [formState, setFormState] = useState<AdminArtistFormState>(() => createEmptyArtistFormState());
  const [initialState, setInitialState] = useState<AdminArtistFormState>(() => createEmptyArtistFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode) {
      const empty = createEmptyArtistFormState();
      setFormState(empty);
      setInitialState(empty);
      return;
    }
    if (artistQuery.data?.ok) {
      const mapped = mapArtistToFormState(artistQuery.data.data);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [artistQuery.data, isEditMode]);

  const validation = useMemo(() => validateArtistForm(formState), [formState]);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialState);
  const isSaving = createArtist.isPending || updateArtist.isPending;
  const hasLoadError = artistQuery.isError || artistQuery.data?.ok === false;

  const updateField = <K extends keyof AdminArtistFormState>(field: K, value: AdminArtistFormState[K]) => {
    setFormState((current) => {
      const next = { ...current, [field]: value };
      if (field === "displayName" && !current.slug.trim()) {
        next.slug = slugifyArtistValue(String(value));
      }
      return next;
    });
  };

  const updateExternalLink = (platform: keyof AdminArtistFormState["externalLinks"], value: string) => {
    setFormState((current) => ({
      ...current,
      externalLinks: { ...current.externalLinks, [platform]: value },
    }));
  };

  const prepareArtworkForSubmit = async (state: AdminArtistFormState): Promise<AdminArtistFormState> => {
    let nextState = state;
    const artworkFields: Array<{
      kind: ArtistArtworkUploadKind;
      assetId: string;
      url: string;
      label: string;
    }> = [
      { kind: "profileImage", assetId: nextState.profileImageAssetId, url: nextState.profileImage, label: "Profile image" },
      { kind: "thumbnailImage", assetId: nextState.profileThumbnailAssetId, url: nextState.profileThumbnailUrl, label: "Thumbnail image" },
      { kind: "bannerImage", assetId: nextState.profileBannerAssetId, url: nextState.profileBannerUrl, label: "Banner image" },
      { kind: "characterArt", assetId: nextState.characterArtAssetId, url: nextState.characterArtUrl, label: "Character art" },
    ];

    for (const field of artworkFields) {
      const assetId = field.assetId.trim();
      if (!assetId || isArtistPublicDeliveryMediaUrl(field.url)) continue;
      const assetResult = await adminMediaService.getMediaAsset(assetId);
      if (!assetResult.ok) throw new Error(`${field.label} asset could not be loaded for public promotion.`);
      const promoted = await adminMediaService.promoteMediaAssetForPublicUse(assetResult.data);
      if (!promoted.ok) throw new Error(promoted.error.message || `${field.label} could not be promoted for public use.`);
      const patch = mapArtistArtworkAssetToArtistFields(promoted.data, nextState, field.kind);
      const promotedUrl = patch
        ? String(patch[field.kind === "profileImage" ? "profileImage" : field.kind === "thumbnailImage" ? "profileThumbnailUrl" : field.kind === "bannerImage" ? "profileBannerUrl" : "characterArtUrl"] ?? "")
        : "";
      if (!patch || !isArtistPublicDeliveryMediaUrl(promotedUrl)) throw new Error(`${field.label} did not produce a public-safe URL after promotion.`);
      nextState = { ...nextState, ...patch, pendingArtistArtworkAssignment: !nextState.artistId?.trim() };
    }

    return nextState;
  };

  const submit = async (forceDraft = false) => {
    setSubmitError(null);
    const preparedState = await prepareArtworkForSubmit(forceDraft ? { ...formState, status: "draft" as const } : formState).catch((error) => {
      const message = error instanceof Error ? error.message : "Artist artwork could not be prepared for public use.";
      setSubmitError(message);
      return null;
    });
    if (!preparedState) return false;
    const stateToSubmit = preparedState;
    const nextValidation = validateArtistForm(stateToSubmit);
    if (!nextValidation.valid) {
      setSubmitError("Please resolve validation errors before saving.");
      return false;
    }

    const result = isEditMode && artistId
      ? await updateArtist.mutateAsync({ artistId, payload: toUpdateArtistDto(stateToSubmit) })
      : await createArtist.mutateAsync(toCreateArtistDto(stateToSubmit));

    if (!result.ok) {
      setSubmitError(result.error.message);
      return false;
    }

    const mapped = mapArtistToFormState(result.data);
    setFormState(mapped);
    setInitialState(mapped);
    if (!isEditMode) navigate(`/admin/artists/${result.data.artistId}/edit`);
    return result.data;
  };

  return {
    artistQuery,
    formState,
    validation,
    isEditMode,
    isDirty,
    isSaving,
    hasLoadError,
    submitError,
    setFormState,
    updateField,
    updateExternalLink,
    submit,
    cancel: () => navigate("/admin/artists"),
  };
}
