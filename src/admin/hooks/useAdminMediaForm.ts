import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminArtists,
  useAdminMediaAsset,
  useAdminReleases,
  useCreateAdminMediaAsset,
  useUpdateAdminMediaAsset,
} from "../../hooks/admin/useAdminContent";
import type { AdminMediaFormState } from "../utils/adminMediaFormUtils";
import {
  createEmptyMediaFormState,
  mapMediaAssetToFormState,
  toCreateMediaAssetDto,
  toUpdateMediaAssetDto,
  validateMediaAssetForm,
} from "../utils/adminMediaFormUtils";

const summarizeValidationErrors = (errors: Record<string, string>): string =>
  Object.values(errors).filter(Boolean).join(" ");

export function useAdminMediaForm(assetId?: string) {
  const navigate = useNavigate();
  const isEditMode = Boolean(assetId);
  const assetQuery = useAdminMediaAsset(assetId);
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const createAsset = useCreateAdminMediaAsset();
  const updateAsset = useUpdateAdminMediaAsset();
  const [formState, setFormState] = useState<AdminMediaFormState>(() => createEmptyMediaFormState());
  const [initialState, setInitialState] = useState<AdminMediaFormState>(() => createEmptyMediaFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const artists = useMemo(() => (artistsQuery.data?.ok ? artistsQuery.data.data : []), [artistsQuery.data]);
  const releases = useMemo(() => (releasesQuery.data?.ok ? releasesQuery.data.data : []), [releasesQuery.data]);
  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.artistId === formState.ownerId) ?? null,
    [artists, formState.ownerId],
  );
  const selectedRelease = useMemo(
    () => releases.find((release) => release.releaseId === formState.ownerId) ?? null,
    [releases, formState.ownerId],
  );

  useEffect(() => {
    if (!isEditMode) {
      const empty = createEmptyMediaFormState();
      setFormState(empty);
      setInitialState(empty);
      return;
    }
    if (assetQuery.data?.ok) {
      const mapped = mapMediaAssetToFormState(assetQuery.data.data);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [assetQuery.data, isEditMode]);

  const ownerArtist = formState.ownerType === "artist" ? selectedArtist : null;
  const ownerRelease = formState.ownerType === "release" ? selectedRelease : null;
  const validation = useMemo(
    () => validateMediaAssetForm(formState, ownerArtist, ownerRelease),
    [formState, ownerArtist, ownerRelease],
  );
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialState);
  const isSaving = createAsset.isPending || updateAsset.isPending;
  const isLoading = (isEditMode && assetQuery.isLoading) || artistsQuery.isLoading || releasesQuery.isLoading;
  const hasLoadError =
    assetQuery.isError ||
    assetQuery.data?.ok === false ||
    artistsQuery.isError ||
    artistsQuery.data?.ok === false ||
    releasesQuery.isError ||
    releasesQuery.data?.ok === false;

  const updateField = <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => {
    setFormState((current) => {
      const next = { ...current, [field]: value };
      if (field === "ownerType") next.ownerId = value === "site" ? "site" : "";
      return next;
    });
  };

  const submit = async (forceDraft = false) => {
    setSubmitError(null);
    const stateToSubmit = forceDraft ? { ...formState, status: "draft" as const } : formState;
    const nextValidation = validateMediaAssetForm(stateToSubmit, ownerArtist, ownerRelease);
    if (!nextValidation.valid) {
      setSubmitError(summarizeValidationErrors(nextValidation.errors) || "Please resolve validation errors before saving.");
      return false;
    }

    const result = isEditMode && assetId
      ? await updateAsset.mutateAsync({ assetId, payload: toUpdateMediaAssetDto(stateToSubmit) })
      : await createAsset.mutateAsync(toCreateMediaAssetDto(stateToSubmit));

    if (!result.ok) {
      setSubmitError(result.error.message);
      return false;
    }

    const mapped = mapMediaAssetToFormState(result.data);
    setFormState(mapped);
    setInitialState(mapped);
    if (!isEditMode) navigate(`/admin/media/${result.data.assetId}/edit`);
    return true;
  };

  return {
    assetQuery,
    artistsQuery,
    releasesQuery,
    artists,
    releases,
    selectedArtist,
    selectedRelease,
    formState,
    validation,
    isEditMode,
    isDirty,
    isSaving,
    isLoading,
    hasLoadError,
    submitError,
    updateField,
    submit,
    cancel: () => navigate("/admin/media"),
  };
}
