import type { AdminHomepageSectionFormState, AdminHomepageSectionFormValidation } from "../../../utils/adminHomepageSectionFormUtils";
import { FieldShell, SelectInput, TextArea, TextInput } from "./AdminHomepageSectionFormControls";
import { AdminHomepageSectionFormSection } from "./AdminHomepageSectionFormSection";

interface AdminHomepageSectionConfigFieldsProps {
  state: AdminHomepageSectionFormState;
  validation: AdminHomepageSectionFormValidation;
  updateField: <K extends keyof AdminHomepageSectionFormState>(field: K, value: AdminHomepageSectionFormState[K]) => void;
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-white">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-white/20 bg-black/30 text-anm-pink focus:ring-anm-pink"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function AdminHomepageSectionConfigFields({ state, validation, updateField }: AdminHomepageSectionConfigFieldsProps) {
  return (
    <AdminHomepageSectionFormSection title="Section Configuration" description="Section-specific fields are intentionally simple and API-ready for future visual editors.">
      {state.sectionType === "hero" || state.sectionType === "explore_artists_cta" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="Primary CTA Label" htmlFor="section-primary-cta-label">
              <TextInput id="section-primary-cta-label" value={state.primaryCtaLabel} onChange={(event) => updateField("primaryCtaLabel", event.target.value)} />
            </FieldShell>
            <FieldShell label="Primary CTA Route" htmlFor="section-primary-cta-route" error={validation.errors.primaryCtaRoute}>
              <TextInput id="section-primary-cta-route" value={state.primaryCtaRoute} onChange={(event) => updateField("primaryCtaRoute", event.target.value)} placeholder="/artists" />
            </FieldShell>
            <FieldShell label="Secondary CTA Label" htmlFor="section-secondary-cta-label">
              <TextInput id="section-secondary-cta-label" value={state.secondaryCtaLabel} onChange={(event) => updateField("secondaryCtaLabel", event.target.value)} />
            </FieldShell>
            <FieldShell label="Secondary CTA Route" htmlFor="section-secondary-cta-route" error={validation.errors.secondaryCtaRoute}>
              <TextInput id="section-secondary-cta-route" value={state.secondaryCtaRoute} onChange={(event) => updateField("secondaryCtaRoute", event.target.value)} placeholder="/browse" />
            </FieldShell>
          </div>
          {state.sectionType === "hero" ? (
            <FieldShell label="Background Image URL" htmlFor="section-background-image">
              <TextInput id="section-background-image" value={state.backgroundImageUrl} onChange={(event) => updateField("backgroundImageUrl", event.target.value)} />
            </FieldShell>
          ) : null}
        </>
      ) : null}

      {state.sectionType === "featured_release" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="Release ID" htmlFor="section-featured-release-id">
              <TextInput id="section-featured-release-id" value={state.releaseId} onChange={(event) => updateField("releaseId", event.target.value)} />
            </FieldShell>
            <FieldShell label="Placement" htmlFor="section-featured-placement">
              <TextInput id="section-featured-placement" value={state.placement} onChange={(event) => updateField("placement", event.target.value)} />
            </FieldShell>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Show audio preview" checked={state.showAudioPreview} onChange={(checked) => updateField("showAudioPreview", checked)} />
            <ToggleField label="Fallback to latest release" checked={state.fallbackToLatest} onChange={(checked) => updateField("fallbackToLatest", checked)} />
          </div>
        </>
      ) : null}

      {state.sectionType === "latest_releases" ? (
        <>
          <FieldShell label="Max Releases Per Artist" htmlFor="section-max-releases" error={validation.errors.maxReleasesPerArtist}>
            <TextInput id="section-max-releases" value={state.maxReleasesPerArtist} onChange={(event) => updateField("maxReleasesPerArtist", event.target.value)} inputMode="numeric" />
          </FieldShell>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Show artist grouping" checked={state.showArtistGrouping} onChange={(checked) => updateField("showArtistGrouping", checked)} />
            <ToggleField label="Show audio preview" checked={state.showAudioPreview} onChange={(checked) => updateField("showAudioPreview", checked)} />
          </div>
        </>
      ) : null}

      {state.sectionType === "artist_spotlight" ? (
        <>
          <FieldShell label="Max Artists" htmlFor="section-max-artists" error={validation.errors.maxArtists}>
            <TextInput id="section-max-artists" value={state.maxArtists} onChange={(event) => updateField("maxArtists", event.target.value)} inputMode="numeric" />
          </FieldShell>
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Featured only" checked={state.featuredOnly} onChange={(checked) => updateField("featuredOnly", checked)} />
            <ToggleField label="Show latest release" checked={state.showLatestRelease} onChange={(checked) => updateField("showLatestRelease", checked)} />
          </div>
        </>
      ) : null}

      {state.sectionType === "about" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ToggleField label="Show feature cards" checked={state.showFeatureCards} onChange={(checked) => updateField("showFeatureCards", checked)} />
          <ToggleField label="Enable visual panel" checked={state.visualPanelEnabled} onChange={(checked) => updateField("visualPanelEnabled", checked)} />
        </div>
      ) : null}

      {state.sectionType === "gallery_preview" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Max Items" htmlFor="section-max-items" error={validation.errors.maxItems}>
            <TextInput id="section-max-items" value={state.maxItems} onChange={(event) => updateField("maxItems", event.target.value)} inputMode="numeric" />
          </FieldShell>
          <FieldShell label="Media Type Filter" htmlFor="section-media-filter">
            <SelectInput id="section-media-filter" value={state.mediaTypeFilter} onChange={(event) => updateField("mediaTypeFilter", event.target.value)}>
              <option value="">Any media type</option>
              <option value="cover_art">Cover Art</option>
              <option value="artist_profile">Artist Profile</option>
              <option value="promo_graphic">Promo Graphic</option>
              <option value="video_thumbnail">Video Thumbnail</option>
            </SelectInput>
          </FieldShell>
        </div>
      ) : null}

      {state.sectionType === "custom" ? (
        <FieldShell label="Raw Configuration JSON" htmlFor="section-raw-json" error={validation.errors.rawConfiguration}>
          <TextArea id="section-raw-json" value={state.rawConfiguration} onChange={(event) => updateField("rawConfiguration", event.target.value)} />
        </FieldShell>
      ) : null}
    </AdminHomepageSectionFormSection>
  );
}
