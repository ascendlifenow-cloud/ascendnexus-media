import type { AdminHomepageSectionFormState, AdminHomepageSectionFormValidation } from "../../../utils/adminHomepageSectionFormUtils";
import { AdminHomepageSectionConfigFields } from "./AdminHomepageSectionConfigFields";
import { AdminHomepageSectionDisplayFields } from "./AdminHomepageSectionDisplayFields";
import { AdminHomepageSectionIdentityFields } from "./AdminHomepageSectionIdentityFields";
import { AdminHomepageSectionTypeFields } from "./AdminHomepageSectionTypeFields";
import { AdminHomepageSectionVisibilityFields } from "./AdminHomepageSectionVisibilityFields";

interface AdminHomepageSectionFormProps {
  state: AdminHomepageSectionFormState;
  validation: AdminHomepageSectionFormValidation;
  isEditMode: boolean;
  updateField: <K extends keyof AdminHomepageSectionFormState>(field: K, value: AdminHomepageSectionFormState[K]) => void;
}

export function AdminHomepageSectionForm({ state, validation, isEditMode, updateField }: AdminHomepageSectionFormProps) {
  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
      <AdminHomepageSectionIdentityFields state={state} validation={validation} isEditMode={isEditMode} updateField={updateField} />
      <AdminHomepageSectionTypeFields state={state} validation={validation} updateField={updateField} />
      <AdminHomepageSectionDisplayFields state={state} updateField={updateField} />
      <AdminHomepageSectionConfigFields state={state} validation={validation} updateField={updateField} />
      <AdminHomepageSectionVisibilityFields state={state} validation={validation} updateField={updateField} />
    </form>
  );
}
