import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { FieldShell, TextInput } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGalleryIdentityFieldsProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  isEditMode: boolean;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

export function AdminGalleryIdentityFields({ state, validation, isEditMode, updateField }: AdminGalleryIdentityFieldsProps) {
  return (
    <AdminGalleryFormSection title="Gallery Item Identity" description="Create the public-facing title and route-safe slug for this gallery item.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Title" htmlFor="gallery-title" error={validation.errors.title} required={state.status === "published"}>
          <TextInput id="gallery-title" value={state.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Nova Rea Profile Visual" />
        </FieldShell>
        <FieldShell label="Slug" htmlFor="gallery-slug" error={validation.errors.slug} help="Lowercase, hyphen-separated, and stable for future gallery routes.">
          <TextInput id="gallery-slug" value={state.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="nova-rea-profile-visual" />
        </FieldShell>
      </div>
      {isEditMode ? (
        <FieldShell label="Gallery Item ID" htmlFor="gallery-item-id" help="Readonly after creation.">
          <TextInput id="gallery-item-id" value={state.galleryItemId ?? ""} readOnly className="cursor-not-allowed text-white/58" />
        </FieldShell>
      ) : null}
    </AdminGalleryFormSection>
  );
}
