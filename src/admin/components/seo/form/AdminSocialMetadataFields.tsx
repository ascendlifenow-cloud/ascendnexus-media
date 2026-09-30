import type { AdminMetadataFormState, AdminMetadataFormValidation } from "../../../utils/adminMetadataFormUtils";
import { socialTypeLabels, twitterCardLabels } from "../../../utils/adminMetadataFormUtils";
import { FieldShell, FormSection, SelectInput, TextArea, TextInput } from "./AdminMetadataFormControls";

interface Props {
  state: AdminMetadataFormState;
  validation: AdminMetadataFormValidation;
  updateField: <K extends keyof AdminMetadataFormState>(field: K, value: AdminMetadataFormState[K]) => void;
}

export function AdminSocialMetadataFields({ state, validation, updateField }: Props) {
  return (
    <FormSection title="Social Share Metadata" description="Blank social fields fall back to SEO fields and generated defaults.">
      <FieldShell label="Social Title" htmlFor="metadata-social-title">
        <TextInput id="metadata-social-title" value={state.socialTitle} onChange={(event) => updateField("socialTitle", event.target.value)} />
      </FieldShell>
      <FieldShell label="Social Description" htmlFor="metadata-social-description">
        <TextArea id="metadata-social-description" value={state.socialDescription} onChange={(event) => updateField("socialDescription", event.target.value)} />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Social Image URL" htmlFor="metadata-social-image" error={validation.errors.socialImageUrl}>
          <TextInput id="metadata-social-image" value={state.socialImageUrl} onChange={(event) => updateField("socialImageUrl", event.target.value)} />
        </FieldShell>
        <FieldShell label="Social Image Alt" htmlFor="metadata-social-image-alt">
          <TextInput id="metadata-social-image-alt" value={state.socialImageAlt} onChange={(event) => updateField("socialImageAlt", event.target.value)} />
        </FieldShell>
        <FieldShell label="Open Graph Type" htmlFor="metadata-social-type" error={validation.errors.socialType}>
          <SelectInput id="metadata-social-type" value={state.socialType} onChange={(event) => updateField("socialType", event.target.value as AdminMetadataFormState["socialType"])}>
            {Object.entries(socialTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Twitter Card" htmlFor="metadata-twitter-card" error={validation.errors.twitterCard}>
          <SelectInput id="metadata-twitter-card" value={state.twitterCard} onChange={(event) => updateField("twitterCard", event.target.value as AdminMetadataFormState["twitterCard"])}>
            {Object.entries(twitterCardLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Twitter Site" htmlFor="metadata-twitter-site">
          <TextInput id="metadata-twitter-site" value={state.twitterSite} onChange={(event) => updateField("twitterSite", event.target.value)} />
        </FieldShell>
        <FieldShell label="Twitter Creator" htmlFor="metadata-twitter-creator">
          <TextInput id="metadata-twitter-creator" value={state.twitterCreator} onChange={(event) => updateField("twitterCreator", event.target.value)} />
        </FieldShell>
      </div>
    </FormSection>
  );
}
