import type { AdminMetadataFormState, AdminMetadataFormValidation } from "../../../utils/adminMetadataFormUtils";
import { FieldShell, FormSection, TextInput } from "./AdminMetadataFormControls";

interface Props {
  state: AdminMetadataFormState;
  validation: AdminMetadataFormValidation;
  updateField: <K extends keyof AdminMetadataFormState>(field: K, value: AdminMetadataFormState[K]) => void;
}

export function AdminMetadataIndexingFields({ state, validation, updateField }: Props) {
  return (
    <FormSection title="Indexing & Canonical" description="No-index prevents public search engines from indexing this page when supported.">
      <FieldShell label="Canonical Path" htmlFor="metadata-canonical" error={validation.errors.canonicalPath}>
        <TextInput id="metadata-canonical" value={state.canonicalPath} onChange={(event) => updateField("canonicalPath", event.target.value)} />
      </FieldShell>
      <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-white">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-anm-pink focus:ring-anm-pink"
          checked={state.noIndex}
          onChange={(event) => updateField("noIndex", event.target.checked)}
        />
        No-index
      </label>
    </FormSection>
  );
}
