import type { MediaAssetType } from "../../../../models/admin";
import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { mediaAssetTypeLabels } from "../../../utils/adminMediaFormUtils";
import { FieldShell, SelectInput, TextInput } from "./AdminMediaFormControls";
import { AdminMediaFormSection } from "./AdminMediaFormSection";

interface AdminMediaClassificationFieldsProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

const assetTypes = Object.keys(mediaAssetTypeLabels) as MediaAssetType[];

export function AdminMediaClassificationFields({ state, validation, updateField }: AdminMediaClassificationFieldsProps) {
  return (
    <AdminMediaFormSection title="Asset Classification" description="Classify how the asset is intended to be used across public and admin surfaces.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Asset Type" htmlFor="media-asset-type" error={validation.errors.assetType} required>
          <SelectInput
            id="media-asset-type"
            value={state.assetType}
            onChange={(event) => updateField("assetType", event.target.value as AdminMediaFormState["assetType"])}
          >
            {assetTypes.map((assetType) => (
              <option key={assetType} value={assetType}>{mediaAssetTypeLabels[assetType]}</option>
            ))}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Sort Order" htmlFor="media-sort-order" error={validation.errors.sortOrder} help="Optional numeric ordering value.">
          <TextInput id="media-sort-order" value={state.sortOrder} onChange={(event) => updateField("sortOrder", event.target.value)} inputMode="numeric" />
        </FieldShell>
      </div>
    </AdminMediaFormSection>
  );
}
