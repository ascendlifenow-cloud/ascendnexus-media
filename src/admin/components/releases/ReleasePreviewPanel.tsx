import type { ArtistAdminRecord } from "../../../models/admin";
import type { AdminReleaseFormState } from "../../utils/adminReleaseFormUtils";
import { AdminReleaseFormPreviewPanel } from "./form/AdminReleaseFormPreviewPanel";

interface ReleasePreviewPanelProps {
  state: AdminReleaseFormState;
  artist: ArtistAdminRecord | null;
  isDirty: boolean;
}

export function ReleasePreviewPanel({ state, artist, isDirty }: ReleasePreviewPanelProps) {
  return (
    <section aria-label="Draft release preview" className="grid gap-3">
      <div>
        <h3 className="text-base font-semibold text-white">Release Preview</h3>
        <p className="mt-1 text-sm text-white/52">Draft preview only. This does not publish the release or expose private media.</p>
      </div>
      <AdminReleaseFormPreviewPanel state={state} artist={artist} isDirty={isDirty} />
    </section>
  );
}
