import type { AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, TextArea } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseLyricsFieldsProps {
  state: AdminReleaseFormState;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseLyricsFields({ state, updateField }: AdminReleaseLyricsFieldsProps) {
  return (
    <AdminReleaseFormSection title="Lyrics & Notes" description="Text foundations for future public lyrics and internal editorial context.">
      <FieldShell label="Lyrics" htmlFor="release-lyrics" help="Plain textarea for now; rich editing can come later.">
        <TextArea id="release-lyrics" value={state.lyrics} onChange={(event) => updateField("lyrics", event.target.value)} />
      </FieldShell>
      <FieldShell label="Internal Notes" htmlFor="release-internal-notes" help="Saved into metadata for future admin-only workflows.">
        <TextArea id="release-internal-notes" value={state.internalNotes} onChange={(event) => updateField("internalNotes", event.target.value)} />
      </FieldShell>
    </AdminReleaseFormSection>
  );
}
