import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, SelectInput, TextArea, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseSocialFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseSocialFields({ state, validation, updateField }: AdminReleaseSocialFieldsProps) {
  return (
    <AdminReleaseFormSection title="Social Preview Metadata" description="If left blank, public social previews use cover-art defaults.">
      <FieldShell label="Social Title" htmlFor="release-social-title">
        <TextInput id="release-social-title" value={state.socialTitle} onChange={(event) => updateField("socialTitle", event.target.value)} />
      </FieldShell>
      <FieldShell label="Social Description" htmlFor="release-social-description">
        <TextArea id="release-social-description" value={state.socialDescription} onChange={(event) => updateField("socialDescription", event.target.value)} />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Social Image URL" htmlFor="release-social-image" error={validation.errors.socialImageUrl}>
          <TextInput id="release-social-image" value={state.socialImageUrl} onChange={(event) => updateField("socialImageUrl", event.target.value)} />
        </FieldShell>
        <FieldShell label="Social Image Alt" htmlFor="release-social-alt">
          <TextInput id="release-social-alt" value={state.socialImageAlt} onChange={(event) => updateField("socialImageAlt", event.target.value)} />
        </FieldShell>
      </div>
      <FieldShell label="Twitter Card Type" htmlFor="release-twitter-card">
        <SelectInput
          id="release-twitter-card"
          value={state.twitterCard}
          onChange={(event) => updateField("twitterCard", event.target.value as AdminReleaseFormState["twitterCard"])}
        >
          <option value="summary">Summary</option>
          <option value="summary_large_image">Summary Large Image</option>
          <option value="player">Player</option>
        </SelectInput>
      </FieldShell>
    </AdminReleaseFormSection>
  );
}
