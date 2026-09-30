import type { AdminHomepageSectionFormState, AdminHomepageSectionFormValidation } from "../../../utils/adminHomepageSectionFormUtils";
import { FieldShell, TextInput } from "./AdminHomepageSectionFormControls";
import { AdminHomepageSectionFormSection } from "./AdminHomepageSectionFormSection";

interface AdminHomepageSectionIdentityFieldsProps {
  state: AdminHomepageSectionFormState;
  validation: AdminHomepageSectionFormValidation;
  isEditMode: boolean;
  updateField: <K extends keyof AdminHomepageSectionFormState>(field: K, value: AdminHomepageSectionFormState[K]) => void;
}

export function AdminHomepageSectionIdentityFields({ state, validation, isEditMode, updateField }: AdminHomepageSectionIdentityFieldsProps) {
  return (
    <AdminHomepageSectionFormSection title="Section Identity" description="Stable section identity and optional section-level heading copy.">
      <FieldShell label="Section ID" htmlFor="homepage-section-id" error={validation.errors.sectionId} required help="Lowercase, hyphen-separated, and stable for config references.">
        <TextInput
          id="homepage-section-id"
          value={state.sectionId}
          readOnly={isEditMode}
          className={isEditMode ? "cursor-not-allowed text-white/58" : undefined}
          onChange={(event) => updateField("sectionId", event.target.value)}
        />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Title" htmlFor="homepage-section-title">
          <TextInput id="homepage-section-title" value={state.title} onChange={(event) => updateField("title", event.target.value)} />
        </FieldShell>
        <FieldShell label="Subtitle" htmlFor="homepage-section-subtitle">
          <TextInput id="homepage-section-subtitle" value={state.subtitle} onChange={(event) => updateField("subtitle", event.target.value)} />
        </FieldShell>
      </div>
    </AdminHomepageSectionFormSection>
  );
}
