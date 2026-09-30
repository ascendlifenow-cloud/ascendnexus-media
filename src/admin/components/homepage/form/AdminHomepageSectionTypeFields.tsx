import type { HomepageSectionType } from "../../../../models/admin";
import type { AdminHomepageSectionFormState, AdminHomepageSectionFormValidation } from "../../../utils/adminHomepageSectionFormUtils";
import { homepageSectionTypeLabels } from "../../../utils/adminHomepageSectionFormUtils";
import { FieldShell, SelectInput } from "./AdminHomepageSectionFormControls";
import { AdminHomepageSectionFormSection } from "./AdminHomepageSectionFormSection";

interface AdminHomepageSectionTypeFieldsProps {
  state: AdminHomepageSectionFormState;
  validation: AdminHomepageSectionFormValidation;
  updateField: <K extends keyof AdminHomepageSectionFormState>(field: K, value: AdminHomepageSectionFormState[K]) => void;
}

const sectionTypes = Object.keys(homepageSectionTypeLabels) as HomepageSectionType[];

export function AdminHomepageSectionTypeFields({ state, validation, updateField }: AdminHomepageSectionTypeFieldsProps) {
  return (
    <AdminHomepageSectionFormSection title="Section Type" description="Choose the public homepage section renderer or custom configuration foundation.">
      <FieldShell label="Section Type" htmlFor="homepage-section-type" error={validation.errors.sectionType} required>
        <SelectInput
          id="homepage-section-type"
          value={state.sectionType}
          onChange={(event) => updateField("sectionType", event.target.value as AdminHomepageSectionFormState["sectionType"])}
        >
          {sectionTypes.map((sectionType) => (
            <option key={sectionType} value={sectionType}>{homepageSectionTypeLabels[sectionType]}</option>
          ))}
        </SelectInput>
      </FieldShell>
    </AdminHomepageSectionFormSection>
  );
}
