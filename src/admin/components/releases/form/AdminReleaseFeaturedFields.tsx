import type { AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import type { ArtistAdminRecord } from "../../../../models/admin";
import { validateFeaturedReleaseReadiness } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, SelectInput, TextArea, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseFeaturedFieldsProps {
  state: AdminReleaseFormState;
  artist: ArtistAdminRecord | null;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseFeaturedFields({ state, artist, updateField }: AdminReleaseFeaturedFieldsProps) {
  const warnings = validateFeaturedReleaseReadiness(state, artist);

  return (
    <AdminReleaseFormSection title="Featured Release Settings" description="Prepare homepage, artist, browse, search, and custom feature placement.">
      <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-white">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-anm-pink focus:ring-anm-pink"
          checked={state.featured}
          onChange={(event) => updateField("featured", event.target.checked)}
        />
        Featured release
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Featured Placement" htmlFor="release-featured-placement">
          <SelectInput
            id="release-featured-placement"
            value={state.featuredPlacement}
            onChange={(event) => updateField("featuredPlacement", event.target.value as AdminReleaseFormState["featuredPlacement"])}
          >
            <option value="homepage">Homepage</option>
            <option value="artist">Artist</option>
            <option value="browse">Browse</option>
            <option value="search">Search</option>
            <option value="global">Global</option>
            <option value="custom">Custom</option>
          </SelectInput>
        </FieldShell>
        <FieldShell label="Featured Sort Order" htmlFor="release-featured-sort" help="Numeric when used." error={warnings.find((warning) => warning.includes("sort"))}>
          <TextInput id="release-featured-sort" value={state.featuredSortOrder} onChange={(event) => updateField("featuredSortOrder", event.target.value)} inputMode="numeric" />
        </FieldShell>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Featured Label" htmlFor="release-featured-label">
          <TextInput id="release-featured-label" value={state.featuredLabel} onChange={(event) => updateField("featuredLabel", event.target.value)} />
        </FieldShell>
        <FieldShell label="Featured Description" htmlFor="release-featured-description">
          <TextArea id="release-featured-description" value={state.featuredDescription} onChange={(event) => updateField("featuredDescription", event.target.value)} />
        </FieldShell>
      </div>
      {warnings.length ? (
        <div className="grid gap-2">
          {warnings.map((warning) => (
            <p key={warning} className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </AdminReleaseFormSection>
  );
}
