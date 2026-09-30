import type { AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseGenreStyleFieldsProps {
  state: AdminReleaseFormState;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseGenreStyleFields({ state, updateField }: AdminReleaseGenreStyleFieldsProps) {
  return (
    <AdminReleaseFormSection title="Genre & Style Tags" description="Support public browsing, search, and artist style summaries.">
      <FieldShell label="Style Tags" htmlFor="release-style-tags" help="Comma-separated. Duplicates are removed on save.">
        <TextInput
          id="release-style-tags"
          value={state.styleTagsInput}
          onChange={(event) => updateField("styleTagsInput", event.target.value)}
          placeholder="dreamy, cosmic, cinematic, uplifting"
        />
      </FieldShell>
    </AdminReleaseFormSection>
  );
}
