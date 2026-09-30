import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, TextArea, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseSeoFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseSeoFields({ state, validation, updateField }: AdminReleaseSeoFieldsProps) {
  return (
    <AdminReleaseFormSection title="SEO Metadata" description="If left blank, public pages use generated song metadata defaults.">
      <FieldShell label="SEO Title" htmlFor="release-seo-title">
        <TextInput id="release-seo-title" value={state.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} />
      </FieldShell>
      <FieldShell label="SEO Description" htmlFor="release-seo-description">
        <TextArea id="release-seo-description" value={state.seoDescription} onChange={(event) => updateField("seoDescription", event.target.value)} />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Canonical Path" htmlFor="release-seo-canonical">
          <TextInput id="release-seo-canonical" value={state.seoCanonicalPath} onChange={(event) => updateField("seoCanonicalPath", event.target.value)} placeholder={`/songs/${state.slug || "song-slug"}`} />
        </FieldShell>
        <FieldShell label="SEO Image URL" htmlFor="release-seo-image" error={validation.errors.seoImageUrl}>
          <TextInput id="release-seo-image" value={state.seoImageUrl} onChange={(event) => updateField("seoImageUrl", event.target.value)} />
        </FieldShell>
      </div>
      <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-white">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-anm-pink focus:ring-anm-pink"
          checked={state.seoNoIndex}
          onChange={(event) => updateField("seoNoIndex", event.target.checked)}
        />
        No-index this release when metadata is active
      </label>
    </AdminReleaseFormSection>
  );
}
