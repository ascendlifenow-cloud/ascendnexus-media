import { useParams } from "react-router-dom";
import { PublicErrorState } from "../../components/fallback";
import { GridSkeleton } from "../../components/loading";
import { SEOHead } from "../../components/SEOHead";
import { AdminPageHeader } from "../components";
import { AdminMetadataForm, AdminMetadataFormActions } from "../components/seo/form";
import { useAdminMetadataForm } from "../hooks/useAdminMetadataForm";

export function AdminMetadataFormPage() {
  const { metadataRecordId } = useParams();
  const {
    recordQuery,
    record,
    formState,
    validation,
    preview,
    isDirty,
    isSaving,
    hasLoadError,
    submitError,
    updateField,
    submit,
    cancel,
  } = useAdminMetadataForm(metadataRecordId);

  const metadata = {
    title: "Edit Metadata | Admin | Ascend Nexus Media",
    description: "Edit Ascend Nexus Media SEO and social share metadata.",
    type: "custom" as const,
    noIndex: true,
  };

  return (
    <div className="grid gap-6">
      <SEOHead metadata={metadata} disableSocial />
      <AdminPageHeader
        title="Edit Metadata"
        description="Inspect, edit, validate, preview, save, and prepare SEO and social metadata for public-safe publishing."
        status="ready"
      />

      {recordQuery.isLoading ? <GridSkeleton itemCount={4} variant="block" columns="lg:grid-cols-[1fr_24rem]" /> : null}
      {hasLoadError ? <PublicErrorState title="Metadata record not found" message="This metadata record could not be loaded." /> : null}

      {!recordQuery.isLoading && !hasLoadError && record && formState && validation && preview ? (
        <>
          <AdminMetadataForm
            record={record}
            state={formState}
            validation={validation}
            preview={preview}
            submitError={submitError}
            updateField={updateField}
          />
          <AdminMetadataFormActions
            record={record}
            isSaving={isSaving}
            isDirty={isDirty}
            onSave={() => void submit(false)}
            onSaveNoIndex={() => void submit(true)}
            onCancel={cancel}
          />
        </>
      ) : null}
    </div>
  );
}
