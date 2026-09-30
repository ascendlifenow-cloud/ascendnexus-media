import { RefreshCw, UploadCloud } from "lucide-react";
import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { Button } from "../../../../components/ui/Button";
import { FieldShell, TextInput } from "./AdminMediaFormControls";
import { AdminMediaFormSection } from "./AdminMediaFormSection";

interface AdminMediaSourceFieldsProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  isEditMode: boolean;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

export function AdminMediaSourceFields({ state, validation, isEditMode, updateField }: AdminMediaSourceFieldsProps) {
  return (
    <AdminMediaFormSection title="Asset Source" description="Reference existing local paths or remote URLs. Upload and replacement are reserved for backend storage integration.">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="glass" disabled>
          <UploadCloud className="h-4 w-4" aria-hidden />
          Upload File
        </Button>
        <Button type="button" variant="glass" disabled>
          <RefreshCw className="h-4 w-4" aria-hidden />
          {isEditMode ? "Replace Asset" : "Replace Asset"}
        </Button>
      </div>
      <FieldShell label="Asset URL" htmlFor="media-url" error={validation.errors.url} required={state.status === "published"}>
        <TextInput id="media-url" value={state.url} onChange={(event) => updateField("url", event.target.value)} placeholder="/images/example.png" />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Thumbnail URL" htmlFor="media-thumbnail-url" error={validation.errors.thumbnailUrl}>
          <TextInput id="media-thumbnail-url" value={state.thumbnailUrl} onChange={(event) => updateField("thumbnailUrl", event.target.value)} />
        </FieldShell>
        <FieldShell label="Large URL" htmlFor="media-large-url" error={validation.errors.largeUrl}>
          <TextInput id="media-large-url" value={state.largeUrl} onChange={(event) => updateField("largeUrl", event.target.value)} />
        </FieldShell>
      </div>
    </AdminMediaFormSection>
  );
}
