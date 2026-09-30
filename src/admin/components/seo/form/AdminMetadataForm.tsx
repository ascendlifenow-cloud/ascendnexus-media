import type { AdminMetadataRecord } from "../../../../models/admin";
import type { AdminMetadataFormState, AdminMetadataFormValidation, MetadataPreviewModel } from "../../../utils/adminMetadataFormUtils";
import { AdminMetadataEntityContext } from "./AdminMetadataEntityContext";
import { AdminMetadataImagePreview } from "./AdminMetadataImagePreview";
import { AdminMetadataIndexingFields } from "./AdminMetadataIndexingFields";
import { AdminMetadataPreviewPanel } from "./AdminMetadataPreviewPanel";
import { AdminMetadataValidationSummary } from "./AdminMetadataValidationSummary";
import { AdminSeoMetadataFields } from "./AdminSeoMetadataFields";
import { AdminSocialMetadataFields } from "./AdminSocialMetadataFields";

interface Props {
  record: AdminMetadataRecord;
  state: AdminMetadataFormState;
  validation: AdminMetadataFormValidation;
  preview: MetadataPreviewModel;
  submitError: string | null;
  updateField: <K extends keyof AdminMetadataFormState>(field: K, value: AdminMetadataFormState[K]) => void;
}

export function AdminMetadataForm({ record, state, validation, preview, submitError, updateField }: Props) {
  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
      <AdminMetadataEntityContext record={record} />
      <AdminSeoMetadataFields state={state} validation={validation} updateField={updateField} />
      <AdminSocialMetadataFields state={state} validation={validation} updateField={updateField} />
      <AdminMetadataImagePreview preview={preview} />
      <AdminMetadataIndexingFields state={state} validation={validation} updateField={updateField} />
      <AdminMetadataValidationSummary validation={validation} submitError={submitError} />
      <AdminMetadataPreviewPanel preview={preview} />
    </form>
  );
}
