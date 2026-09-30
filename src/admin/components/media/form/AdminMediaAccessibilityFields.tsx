import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { isImageMediaAssetType } from "../../../utils/adminMediaFormUtils";
import { FieldShell, TextArea, TextInput } from "./AdminMediaFormControls";
import { AdminMediaFormSection } from "./AdminMediaFormSection";

interface AdminMediaAccessibilityFieldsProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

export function AdminMediaAccessibilityFields({ state, validation, updateField }: AdminMediaAccessibilityFieldsProps) {
  return (
    <AdminMediaFormSection title="Accessibility & Credits" description="Prepare public-safe alt text, descriptive context, and attribution.">
      <FieldShell
        label="Alt Text"
        htmlFor="media-alt-text"
        error={validation.errors.altText}
        required={state.status === "published" && isImageMediaAssetType(state.assetType)}
        help={isImageMediaAssetType(state.assetType) ? "Required before publishing image-based assets." : "Optional descriptive text for non-image assets."}
      >
        <TextArea id="media-alt-text" value={state.altText} onChange={(event) => updateField("altText", event.target.value)} />
      </FieldShell>
      <FieldShell label="Credit" htmlFor="media-credit">
        <TextInput id="media-credit" value={state.credit} onChange={(event) => updateField("credit", event.target.value)} placeholder="Ascend Nexus Media" />
      </FieldShell>
    </AdminMediaFormSection>
  );
}
