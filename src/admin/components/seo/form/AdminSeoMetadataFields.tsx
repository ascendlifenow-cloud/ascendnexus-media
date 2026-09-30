import type { AdminMetadataFormState, AdminMetadataFormValidation } from "../../../utils/adminMetadataFormUtils";
import { FieldShell, FormSection, TextArea, TextInput } from "./AdminMetadataFormControls";

interface Props {
  state: AdminMetadataFormState;
  validation: AdminMetadataFormValidation;
  updateField: <K extends keyof AdminMetadataFormState>(field: K, value: AdminMetadataFormState[K]) => void;
}

export function AdminSeoMetadataFields({ state, validation, updateField }: Props) {
  return (
    <FormSection title="SEO Metadata" description="Blank values use generated fallbacks. Title target is under 60 characters; description target is under 160.">
      <FieldShell label="SEO Title" htmlFor="metadata-seo-title" help={`${state.seoTitle.length}/60 target`}>
        <TextInput id="metadata-seo-title" value={state.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} />
      </FieldShell>
      <FieldShell label="SEO Description" htmlFor="metadata-seo-description" help={`${state.seoDescription.length}/160 target`}>
        <TextArea id="metadata-seo-description" value={state.seoDescription} onChange={(event) => updateField("seoDescription", event.target.value)} />
      </FieldShell>
      <FieldShell label="SEO Keywords" htmlFor="metadata-seo-keywords" help="Comma-separated optional keywords.">
        <TextInput id="metadata-seo-keywords" value={state.seoKeywords} onChange={(event) => updateField("seoKeywords", event.target.value)} />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="SEO Image URL" htmlFor="metadata-seo-image" error={validation.errors.seoImageUrl}>
          <TextInput id="metadata-seo-image" value={state.seoImageUrl} onChange={(event) => updateField("seoImageUrl", event.target.value)} />
        </FieldShell>
        <FieldShell label="SEO Image Alt" htmlFor="metadata-seo-image-alt">
          <TextInput id="metadata-seo-image-alt" value={state.seoImageAlt} onChange={(event) => updateField("seoImageAlt", event.target.value)} />
        </FieldShell>
      </div>
    </FormSection>
  );
}
