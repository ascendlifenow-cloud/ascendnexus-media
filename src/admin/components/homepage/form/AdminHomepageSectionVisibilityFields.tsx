import type { AdminHomepageSectionFormState, AdminHomepageSectionFormValidation } from "../../../utils/adminHomepageSectionFormUtils";
import { FieldShell, TextInput } from "./AdminHomepageSectionFormControls";
import { AdminHomepageSectionFormSection } from "./AdminHomepageSectionFormSection";

interface AdminHomepageSectionVisibilityFieldsProps {
  state: AdminHomepageSectionFormState;
  validation: AdminHomepageSectionFormValidation;
  updateField: <K extends keyof AdminHomepageSectionFormState>(field: K, value: AdminHomepageSectionFormState[K]) => void;
}

export function AdminHomepageSectionVisibilityFields({ state, validation, updateField }: AdminHomepageSectionVisibilityFieldsProps) {
  return (
    <AdminHomepageSectionFormSection title="Visibility & Ordering" description="Enabled sections are eligible for public homepage rendering; disabled sections stay hidden.">
      <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-white">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-anm-pink focus:ring-anm-pink"
          checked={state.enabled}
          onChange={(event) => updateField("enabled", event.target.checked)}
        />
        Enabled
      </label>
      <FieldShell label="Sort Order" htmlFor="homepage-section-sort-order" error={validation.errors.sortOrder} required>
        <TextInput id="homepage-section-sort-order" value={state.sortOrder} onChange={(event) => updateField("sortOrder", event.target.value)} inputMode="numeric" />
      </FieldShell>
    </AdminHomepageSectionFormSection>
  );
}
