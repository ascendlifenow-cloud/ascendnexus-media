import type { AdminHomepageSectionFormState } from "../../../utils/adminHomepageSectionFormUtils";
import { FieldShell, TextArea, TextInput } from "./AdminHomepageSectionFormControls";
import { AdminHomepageSectionFormSection } from "./AdminHomepageSectionFormSection";

interface AdminHomepageSectionDisplayFieldsProps {
  state: AdminHomepageSectionFormState;
  updateField: <K extends keyof AdminHomepageSectionFormState>(field: K, value: AdminHomepageSectionFormState[K]) => void;
}

export function AdminHomepageSectionDisplayFields({ state, updateField }: AdminHomepageSectionDisplayFieldsProps) {
  return (
    <AdminHomepageSectionFormSection title="Display Content" description="Some sections may use internal/default copy when these fields are blank.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Eyebrow" htmlFor="homepage-section-eyebrow">
          <TextInput id="homepage-section-eyebrow" value={state.eyebrow} onChange={(event) => updateField("eyebrow", event.target.value)} />
        </FieldShell>
        <FieldShell label="Description" htmlFor="homepage-section-description">
          <TextArea id="homepage-section-description" value={state.description} onChange={(event) => updateField("description", event.target.value)} />
        </FieldShell>
      </div>
    </AdminHomepageSectionFormSection>
  );
}
