import { useParams } from "react-router-dom";
import { PublicErrorState, PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { AdminPageHeader } from "../components";
import {
  AdminMediaForm,
  AdminMediaFormActions,
  AdminMediaPreviewPanel,
  AdminMediaValidationSummary,
} from "../components/media/form";
import { PublishingActionButtons, PublishingStatusPanel } from "../components/publishing";
import { useAdminMediaForm } from "../hooks/useAdminMediaForm";
import { usePublishingWorkflow } from "../hooks/usePublishingWorkflow";

export function AdminMediaFormPage() {
  const { assetId } = useParams();
  const {
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
    cancel,
  } = useAdminMediaForm(assetId);
  const publishing = usePublishingWorkflow("media_asset", formState, {
    artist: formState.ownerType === "artist" ? selectedArtist : null,
    release: formState.ownerType === "release" ? selectedRelease : null,
  });

  const title = isEditMode ? "Edit Media Asset" : "New Media Asset";
  const metadata = {
    title: `${title} | Admin | Ascend Nexus Media`,
    description: "Create and edit Ascend Nexus Media media asset records.",
    type: "custom" as const,
    noIndex: true,
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />
      <AdminPageHeader
        title={title}
        description="Create, edit, validate, preview, organize, and prepare Ascend Nexus Media media assets for future upload and CDN workflows."
        status="mock"
      />

      {isLoading ? <GridSkeleton itemCount={4} variant="block" columns="lg:grid-cols-[1fr_24rem]" /> : null}
      {hasLoadError ? <PublicErrorState title="Media asset not found" message="This admin media asset record or owner list could not be loaded." /> : null}

      {!isLoading && !hasLoadError ? (
        <>
          <AdminMediaValidationSummary validation={validation} submitError={submitError} />
          <div className="grid gap-6 xl:grid-cols-[1fr_26rem] xl:items-start">
            <AdminMediaForm
              state={formState}
              validation={validation}
              artists={artists}
              releases={releases}
              selectedArtist={selectedArtist}
              selectedRelease={selectedRelease}
              isEditMode={isEditMode}
              updateField={updateField}
            />
            <div className="grid gap-5 xl:sticky xl:top-24">
              <PublishingStatusPanel status={publishing.publishingStatus} />
              <PublishingActionButtons actions={publishing.actions} isSaving={publishing.isSaving} onAction={(action) => void publishing.executeAction(action.actionType)} />
              <AdminMediaPreviewPanel
                state={formState}
                selectedArtist={selectedArtist}
                selectedRelease={selectedRelease}
                isDirty={isDirty}
              />
            </div>
          </div>
          <AdminMediaFormActions
            state={formState}
            selectedArtist={selectedArtist}
            selectedRelease={selectedRelease}
            isSaving={isSaving}
            isDirty={isDirty}
            onSaveDraft={() => void submit(true)}
            onSave={() => void submit(false)}
            onCancel={cancel}
          />
        </>
      ) : null}

      {!isEditMode && hasLoadError ? <PublicLoadingErrorState /> : null}
    </div>
  );
}
