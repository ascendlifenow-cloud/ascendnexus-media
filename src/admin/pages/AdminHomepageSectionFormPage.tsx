import { useParams } from "react-router-dom";
import { PublicErrorState, PublicLoadingErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { AdminPageHeader } from "../components";
import {
  AdminHomepageSectionForm,
  AdminHomepageSectionFormActions,
  AdminHomepageSectionReadinessPanel,
  AdminHomepageSectionValidationSummary,
} from "../components/homepage/form";
import { useAdminHomepageSectionForm } from "../hooks/useAdminHomepageSectionForm";

export function AdminHomepageSectionFormPage() {
  const { sectionId } = useParams();
  const {
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
  } = useAdminHomepageSectionForm(sectionId);

  const title = isEditMode ? "Edit Homepage Section" : "New Homepage Section";
  const metadata = {
    title: `${title} | Admin | Ascend Nexus Media`,
    description: "Create and edit Ascend Nexus Media homepage section configuration.",
    type: "custom" as const,
    noIndex: true,
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />
      <AdminPageHeader
        title={title}
        description="Inspect, edit, validate, enable, disable, reorder, and prepare public homepage section configuration."
        status="ready"
      />

      {isLoading ? <GridSkeleton itemCount={4} variant="block" columns="lg:grid-cols-[1fr_24rem]" /> : null}
      {hasLoadError ? <PublicErrorState title="Homepage section not found" message="This homepage section or site config could not be loaded." /> : null}

      {!isLoading && !hasLoadError ? (
        <>
          <AdminHomepageSectionValidationSummary validation={validation} submitError={submitError} />
          <div className="grid gap-6 xl:grid-cols-[1fr_26rem] xl:items-start">
            <AdminHomepageSectionForm
              state={formState}
              validation={validation}
              isEditMode={isEditMode}
              updateField={updateField}
            />
            <div className="grid gap-5 xl:sticky xl:top-24">
              <AdminHomepageSectionReadinessPanel state={formState} validation={validation} isDirty={isDirty} />
            </div>
          </div>
          <AdminHomepageSectionFormActions
            state={formState}
            isSaving={isSaving}
            isDirty={isDirty}
            onSaveDisabled={() => void submit(true)}
            onSave={() => void submit(false)}
            onCancel={cancel}
          />
        </>
      ) : null}

      {!isEditMode && hasLoadError ? <PublicLoadingErrorState /> : null}
    </div>
  );
}
