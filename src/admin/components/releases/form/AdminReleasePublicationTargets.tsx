import { useId } from "react";
import { publicationAudiences, type AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, SelectInput } from "./AdminReleaseFormControls";

interface AdminReleasePublicationTargetsProps {
  state: AdminReleaseFormState;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

const audienceLabels = {
  public: "Public (including guests)",
  free: "Registered Free and above",
  premium: "Premium and above",
  supporter: "Supporter and above",
  vip: "VIP",
};

export function AdminReleasePublicationTargets({ state, updateField }: AdminReleasePublicationTargetsProps) {
  const id = useId();
  return (
    <fieldset className="grid min-w-0 gap-4 border-t border-white/10 pt-5">
      <legend className="text-lg font-semibold text-white">Publication Destinations</legend>
      <FieldShell label="Minimum Audience" htmlFor={`${id}-audience`}
        error={state.publicationAudience === "" ? "Select a valid minimum audience before saving." : undefined}>
        <SelectInput id={`${id}-audience`} value={state.publicationAudience}
          required aria-invalid={state.publicationAudience === ""}
          onChange={(event) => updateField("publicationAudience", event.target.value as AdminReleaseFormState["publicationAudience"])}>
          <option value="" disabled>Select minimum audience</option>
          {publicationAudiences.map((audience) => <option key={audience} value={audience}>{audienceLabels[audience]}</option>)}
        </SelectInput>
      </FieldShell>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {([ ["publicationHomepage", "Homepage"], ["publicationNewReleases", "New Releases"] ] as const).map(([field, label]) => (
          <label key={field} className="flex min-h-11 items-center gap-2 text-sm text-white">
            <input type="checkbox" className="h-4 w-4" checked={state[field]}
              onChange={(event) => updateField(field, event.target.checked)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
