import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { FieldShell, TextArea, TextInput } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGallerySortFieldsProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

export function AdminGallerySortFields({ state, validation, updateField }: AdminGallerySortFieldsProps) {
  return (
    <AdminGalleryFormSection title="Sort & Placement" description="Prepare ordering and future featured gallery placement metadata.">
      <FieldShell label="Sort Order" htmlFor="gallery-sort-order" error={validation.errors.sortOrder} help="Lower numbers appear earlier.">
        <TextInput id="gallery-sort-order" value={state.sortOrder} onChange={(event) => updateField("sortOrder", event.target.value)} inputMode="numeric" />
      </FieldShell>
      <FieldShell label="Metadata" htmlFor="gallery-metadata" help="Optional JSON-like metadata. Plain text is saved as a note.">
        <TextArea id="gallery-metadata" value={state.metadata} onChange={(event) => updateField("metadata", event.target.value)} />
      </FieldShell>
    </AdminGalleryFormSection>
  );
}
