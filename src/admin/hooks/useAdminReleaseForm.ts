import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminArtists,
  useAdminRelease,
  useCreateAdminRelease,
  useUpdateAdminRelease,
} from "../../hooks/admin/useAdminContent";
import type { ArtistAdminRecord } from "../../models/admin";
import type { AdminReleaseFormState } from "../utils/adminReleaseFormUtils";
import { adminMediaService } from "../../services/admin";
import { isPublicDeliveryMediaUrl, mapCoverArtAssetToReleaseFields } from "../utils/releaseCoverArtUploadUtils";
import { mapAudioAssetToReleaseFields } from "../utils/releaseAudioUploadUtils";
import {
  createEmptyReleaseFormState,
  mapReleaseToFormState,
  slugifyReleaseValue,
  toCreateReleaseDto,
  toUpdateReleaseDto,
  validateReleaseForm,
} from "../utils/adminReleaseFormUtils";

const getArtists = (queryData: ReturnType<typeof useAdminArtists>["data"]): ArtistAdminRecord[] =>
  queryData?.ok ? queryData.data : [];

const summarizeValidationErrors = (errors: Record<string, string>): string =>
  Object.values(errors).filter(Boolean).join(" ");

export function useAdminReleaseForm(releaseId?: string) {
  const navigate = useNavigate();
  const isEditMode = Boolean(releaseId);
  const releaseQuery = useAdminRelease(releaseId);
  const artistsQuery = useAdminArtists();
  const createRelease = useCreateAdminRelease();
  const updateRelease = useUpdateAdminRelease();
  const [formState, setFormState] = useState<AdminReleaseFormState>(() => createEmptyReleaseFormState());
  const [initialState, setInitialState] = useState<AdminReleaseFormState>(() => createEmptyReleaseFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const artists = useMemo(() => getArtists(artistsQuery.data), [artistsQuery.data]);
  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.artistId === formState.artistId) ?? null,
    [artists, formState.artistId],
  );

  useEffect(() => {
    if (!isEditMode) {
      const empty = createEmptyReleaseFormState();
      setFormState(empty);
      setInitialState(empty);
      return;
    }
    if (releaseQuery.data?.ok) {
      const mapped = mapReleaseToFormState(releaseQuery.data.data);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [isEditMode, releaseQuery.data]);

  const validation = useMemo(() => validateReleaseForm(formState, selectedArtist), [formState, selectedArtist]);
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialState);
  const isSaving = createRelease.isPending || updateRelease.isPending;
  const hasLoadError =
    releaseQuery.isError ||
    releaseQuery.data?.ok === false ||
    artistsQuery.isError ||
    artistsQuery.data?.ok === false;

  const updateField = <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => {
    setFormState((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !current.slug.trim()) {
        next.slug = slugifyReleaseValue(String(value));
      }
      return next;
    });
  };

  const updateExternalLink = (platform: keyof AdminReleaseFormState["externalLinks"], value: string) => {
    setFormState((current) => ({
      ...current,
      externalLinks: { ...current.externalLinks, [platform]: value },
    }));
  };

  const prepareStateForSubmit = async (state: AdminReleaseFormState): Promise<AdminReleaseFormState> => {
    let nextState = state;

    if (nextState.coverArtAssetId.trim() && !isPublicDeliveryMediaUrl(nextState.coverArtUrl)) {
      const assetResult = await adminMediaService.getMediaAsset(nextState.coverArtAssetId.trim());
      if (!assetResult.ok) {
        throw new Error("Selected cover art asset could not be loaded for public promotion.");
      }
      const promoted = await adminMediaService.promoteMediaAssetForPublicUse(assetResult.data);
      if (!promoted.ok) {
        throw new Error(promoted.error.message || "Selected cover art could not be promoted for public use.");
      }
      const patch = mapCoverArtAssetToReleaseFields(promoted.data, nextState);
      if (!patch || !isPublicDeliveryMediaUrl(patch.coverArtUrl)) {
        throw new Error("Selected cover art did not produce a public-safe URL after promotion.");
      }
      nextState = { ...nextState, ...patch, pendingCoverArtAssignment: !nextState.releaseId?.trim() };
    }

    if (nextState.audioPreviewAssetId.trim() && !isPublicDeliveryMediaUrl(nextState.audioPreviewUrl)) {
      const assetResult = await adminMediaService.getMediaAsset(nextState.audioPreviewAssetId.trim());
      if (!assetResult.ok) {
        throw new Error("Selected audio preview asset could not be loaded for public promotion.");
      }
      const promoted = await adminMediaService.promoteMediaAssetForPublicUse(assetResult.data);
      if (!promoted.ok) {
        throw new Error(promoted.error.message || "Selected audio preview could not be promoted for public use.");
      }
      const patch = mapAudioAssetToReleaseFields(promoted.data, nextState, "audioPreview");
      if (!patch?.audioPreviewUrl || !isPublicDeliveryMediaUrl(patch.audioPreviewUrl)) {
        throw new Error("Selected audio preview did not produce a public-safe URL after promotion.");
      }
      nextState = { ...nextState, ...patch, pendingAudioPreviewAssignment: !nextState.releaseId?.trim() };
    }

    return nextState;
  };

  const submit = async (forceDraft = false, options: { redirectOnCreate?: boolean } = {}) => {
    setSubmitError(null);
    const preparedState = await prepareStateForSubmit(forceDraft ? { ...formState, status: "draft" as const } : formState);
    const stateToSubmit = preparedState;
    const nextValidation = validateReleaseForm(stateToSubmit, selectedArtist);
    if (!nextValidation.valid) {
      const message = summarizeValidationErrors(nextValidation.errors) || "Please resolve validation errors before saving.";
      setSubmitError(message);
      throw new Error(message);
    }

    let result = isEditMode && releaseId
      ? await updateRelease.mutateAsync({ releaseId, payload: toUpdateReleaseDto(stateToSubmit) })
      : await createRelease.mutateAsync(toCreateReleaseDto(stateToSubmit));

    if (
      !result.ok &&
      !isEditMode &&
      /slug/i.test(result.error.message) &&
      /exist|conflict|already/i.test(result.error.message) &&
      stateToSubmit.slug.trim()
    ) {
      result = await createRelease.mutateAsync(toCreateReleaseDto({ ...stateToSubmit, slug: "" }));
    }

    if (!result.ok) {
      setSubmitError(result.error.message);
      throw new Error(result.error.message);
    }

    const mapped = mapReleaseToFormState(result.data);
    setFormState(mapped);
    setInitialState(mapped);
    if (!isEditMode && options.redirectOnCreate !== false) navigate(`/admin/releases/${result.data.releaseId}/edit`);
    return result.data;
  };

  return {
    releaseQuery,
    artistsQuery,
    artists,
    selectedArtist,
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
    cancel: () => navigate("/admin/releases"),
  };
}
