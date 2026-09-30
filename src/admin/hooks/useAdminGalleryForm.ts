import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAdminArtists,
  useAdminGalleryItem,
  useAdminMediaAssets,
  useAdminReleases,
  useCreateAdminGalleryItem,
  useUpdateAdminGalleryItem,
} from "../../hooks/admin/useAdminContent";
import type { AdminGalleryFormState } from "../utils/adminGalleryFormUtils";
import {
  createEmptyGalleryFormState,
  mapGalleryItemToFormState,
  slugifyGalleryValue,
  toCreateGalleryItemDto,
  toUpdateGalleryItemDto,
  validateGalleryItemForm,
} from "../utils/adminGalleryFormUtils";

export function useAdminGalleryForm(galleryItemId?: string) {
  const navigate = useNavigate();
  const isEditMode = Boolean(galleryItemId);
  const galleryItemQuery = useAdminGalleryItem(galleryItemId);
  const mediaAssetsQuery = useAdminMediaAssets();
  const artistsQuery = useAdminArtists();
  const releasesQuery = useAdminReleases();
  const createGalleryItem = useCreateAdminGalleryItem();
  const updateGalleryItem = useUpdateAdminGalleryItem();
  const [formState, setFormState] = useState<AdminGalleryFormState>(() => createEmptyGalleryFormState());
  const [initialState, setInitialState] = useState<AdminGalleryFormState>(() => createEmptyGalleryFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mediaAssets = useMemo(() => (mediaAssetsQuery.data?.ok ? mediaAssetsQuery.data.data : []), [mediaAssetsQuery.data]);
  const artists = useMemo(() => (artistsQuery.data?.ok ? artistsQuery.data.data : []), [artistsQuery.data]);
  const releases = useMemo(() => (releasesQuery.data?.ok ? releasesQuery.data.data : []), [releasesQuery.data]);
  const selectedMediaAsset = useMemo(
    () => mediaAssets.find((asset) => asset.assetId === formState.mediaAssetId) ?? null,
    [mediaAssets, formState.mediaAssetId],
  );
  const selectedSourceArtist = useMemo(
    () => artists.find((artist) => artist.artistId === formState.sourceId) ?? null,
    [artists, formState.sourceId],
  );
  const selectedSourceRelease = useMemo(
    () => releases.find((release) => release.releaseId === formState.sourceId) ?? null,
    [releases, formState.sourceId],
  );

  useEffect(() => {
    if (!isEditMode) {
      const empty = createEmptyGalleryFormState();
      setFormState(empty);
      setInitialState(empty);
      return;
    }
    if (galleryItemQuery.data?.ok) {
      const mapped = mapGalleryItemToFormState(galleryItemQuery.data.data);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [galleryItemQuery.data, isEditMode]);

  const sourceArtist = formState.sourceType === "artist" ? selectedSourceArtist : null;
  const sourceRelease = formState.sourceType === "release" ? selectedSourceRelease : null;
  const validation = useMemo(
    () => validateGalleryItemForm(formState, selectedMediaAsset, sourceArtist, sourceRelease),
    [formState, selectedMediaAsset, sourceArtist, sourceRelease],
  );
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialState);
  const isSaving = createGalleryItem.isPending || updateGalleryItem.isPending;
  const isLoading =
    (isEditMode && galleryItemQuery.isLoading) ||
    mediaAssetsQuery.isLoading ||
    artistsQuery.isLoading ||
    releasesQuery.isLoading;
  const hasLoadError =
    galleryItemQuery.isError ||
    galleryItemQuery.data?.ok === false ||
    mediaAssetsQuery.isError ||
    mediaAssetsQuery.data?.ok === false ||
    artistsQuery.isError ||
    artistsQuery.data?.ok === false ||
    releasesQuery.isError ||
    releasesQuery.data?.ok === false;

  const updateField = <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => {
    setFormState((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !current.slug.trim()) {
        next.slug = slugifyGalleryValue(String(value));
      }
      if (field === "sourceType") {
        next.sourceId = "";
      }
      if (field === "mediaAssetId") {
        const asset = mediaAssets.find((item) => item.assetId === value);
        if (asset) {
          next.imageUrl = next.imageUrl || asset.url;
          next.thumbnailUrl = next.thumbnailUrl || asset.thumbnailUrl || "";
          next.altText = next.altText || asset.altText || "";
        }
      }
      return next;
    });
  };

  const submit = async (forceDraft = false) => {
    setSubmitError(null);
    const stateToSubmit = forceDraft ? { ...formState, status: "draft" as const } : formState;
    const nextValidation = validateGalleryItemForm(stateToSubmit, selectedMediaAsset, sourceArtist, sourceRelease);
    if (!nextValidation.valid) {
      setSubmitError("Please resolve validation errors before saving.");
      return false;
    }

    const result = isEditMode && galleryItemId
      ? await updateGalleryItem.mutateAsync({ galleryItemId, payload: toUpdateGalleryItemDto(stateToSubmit, selectedMediaAsset) })
      : await createGalleryItem.mutateAsync(toCreateGalleryItemDto(stateToSubmit, selectedMediaAsset));

    if (!result.ok) {
      setSubmitError(result.error.message);
      return false;
    }

    const mapped = mapGalleryItemToFormState(result.data);
    setFormState(mapped);
    setInitialState(mapped);
    if (!isEditMode) navigate(`/admin/gallery/${result.data.galleryItemId}/edit`);
    return true;
  };

  return {
    galleryItemQuery,
    mediaAssetsQuery,
    artistsQuery,
    releasesQuery,
    mediaAssets,
    artists,
    releases,
    selectedMediaAsset,
    selectedSourceArtist,
    selectedSourceRelease,
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
    cancel: () => navigate("/admin/gallery"),
  };
}
