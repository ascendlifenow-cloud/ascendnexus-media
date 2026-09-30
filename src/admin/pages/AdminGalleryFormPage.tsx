import { useParams } from "react-router-dom";
import { PublicErrorState, PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { AdminPageHeader } from "../components";
import {
  AdminGalleryForm,
  AdminGalleryFormActions,
  AdminGalleryPreviewPanel,
  AdminGalleryValidationSummary,
} from "../components/gallery/form";
import { PublishingStatusPanel } from "../components/publishing";
import { useArchiveAdminGalleryItem, usePublishAdminGalleryItem, useRestoreAdminGalleryItem } from "../../hooks/admin/useAdminContent";
import { useAdminGalleryForm } from "../hooks/useAdminGalleryForm";
import { usePublishingWorkflow } from "../hooks/usePublishingWorkflow";

export function AdminGalleryFormPage() {
  const { galleryItemId } = useParams();
  const {
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
    cancel,
  } = useAdminGalleryForm(galleryItemId);
  const publishing = usePublishingWorkflow("gallery_item", formState, {
    artist: formState.sourceType === "artist" ? selectedSourceArtist : null,
    release: formState.sourceType === "release" ? selectedSourceRelease : null,
  });
  const publishGalleryItem = usePublishAdminGalleryItem();
  const archiveGalleryItem = useArchiveAdminGalleryItem();
  const restoreGalleryItem = useRestoreAdminGalleryItem();

  const title = isEditMode ? "Edit Gallery Item" : "New Gallery Item";
  const metadata = {
    title: `${title} | Admin | Ascend Nexus Media`,
    description: "Create and edit Ascend Nexus Media public gallery item records.",
    type: "custom" as const,
    noIndex: true,
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />
      <AdminPageHeader
        title={title}
        description="Create, edit, validate, preview, organize, and prepare Ascend Nexus Media gallery items for publishing workflows."
        status="ready"
      />

      {isLoading ? <GridSkeleton itemCount={4} variant="block" columns="lg:grid-cols-[1fr_24rem]" /> : null}
      {hasLoadError ? <PublicErrorState title="Gallery item not found" message="This gallery item or one of its source lists could not be loaded." /> : null}

      {!isLoading && !hasLoadError ? (
        <>
          <AdminGalleryValidationSummary validation={validation} submitError={submitError} />
          <div className="grid gap-6 xl:grid-cols-[1fr_26rem] xl:items-start">
            <AdminGalleryForm
              state={formState}
              validation={validation}
              mediaAssets={mediaAssets}
              artists={artists}
              releases={releases}
              selectedMediaAsset={selectedMediaAsset}
              selectedArtist={selectedSourceArtist}
              selectedRelease={selectedSourceRelease}
              isEditMode={isEditMode}
              updateField={updateField}
            />
            <div className="grid gap-5 xl:sticky xl:top-24">
              <PublishingStatusPanel status={publishing.publishingStatus} />
              <AdminGalleryPreviewPanel
                state={formState}
                selectedMediaAsset={selectedMediaAsset}
                selectedArtist={selectedSourceArtist}
                selectedRelease={selectedSourceRelease}
                isDirty={isDirty}
              />
            </div>
          </div>
          <AdminGalleryFormActions
            state={formState}
            selectedMediaAsset={selectedMediaAsset}
            selectedArtist={selectedSourceArtist}
            selectedRelease={selectedSourceRelease}
            isSaving={isSaving}
            isDirty={isDirty}
            onSaveDraft={() => void submit(true)}
            onSave={() => void submit(false)}
            onPublish={() => galleryItemId ? void publishGalleryItem.mutateAsync(galleryItemId) : undefined}
            onArchive={() => galleryItemId ? void archiveGalleryItem.mutateAsync(galleryItemId) : undefined}
            onRestore={() => galleryItemId ? void restoreGalleryItem.mutateAsync(galleryItemId) : undefined}
            onCancel={cancel}
          />
        </>
      ) : null}

      {!isEditMode && hasLoadError ? <PublicLoadingErrorState /> : null}
    </div>
  );
}
