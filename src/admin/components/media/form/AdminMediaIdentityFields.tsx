import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { FieldShell, TextArea, TextInput } from "./AdminMediaFormControls";
import { AdminMediaFormSection } from "./AdminMediaFormSection";

interface AdminMediaIdentityFieldsProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  isEditMode: boolean;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

export function AdminMediaIdentityFields({ state, validation, isEditMode, updateField }: AdminMediaIdentityFieldsProps) {
  return (
    <AdminMediaFormSection title="Media Identity" description="Name and describe the asset record before it is connected to public surfaces.">
      <FieldShell label="Title" htmlFor="media-title" error={validation.errors.title} required={state.status === "published"}>
        <TextInput id="media-title" value={state.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Nova Rea profile image" />
      </FieldShell>
      <FieldShell label="Description" htmlFor="media-description">
        <TextArea id="media-description" value={state.description} onChange={(event) => updateField("description", event.target.value)} />
      </FieldShell>
      {isEditMode ? (
        <FieldShell label="Asset ID" htmlFor="media-asset-id" help="Readonly after creation.">
          <TextInput id="media-asset-id" value={state.assetId ?? ""} readOnly className="cursor-not-allowed text-white/58" />
        </FieldShell>
      ) : null}
    </AdminMediaFormSection>
  );
}
