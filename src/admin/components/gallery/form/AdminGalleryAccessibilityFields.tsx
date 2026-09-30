import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { FieldShell, TextArea } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGalleryAccessibilityFieldsProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

export function AdminGalleryAccessibilityFields({ state, validation, updateField }: AdminGalleryAccessibilityFieldsProps) {
  return (
    <AdminGalleryFormSection title="Accessibility & Description" description="Alt text is required before publishing public image-based gallery items.">
      <FieldShell label="Alt Text" htmlFor="gallery-alt-text" error={validation.errors.altText} required={state.status === "published"}>
        <TextArea id="gallery-alt-text" value={state.altText} onChange={(event) => updateField("altText", event.target.value)} />
      </FieldShell>
    </AdminGalleryFormSection>
  );
}
