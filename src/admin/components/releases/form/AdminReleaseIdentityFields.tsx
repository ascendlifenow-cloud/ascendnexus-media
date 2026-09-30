import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { releaseSlugClientService } from "../../../services/ReleaseSlugClientService";
import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseIdentityFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  isEditMode: boolean;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseIdentityFields({ state, validation, isEditMode, updateField }: AdminReleaseIdentityFieldsProps) {
  const [slugMode, setSlugMode] = useState<"auto" | "manual">(state.slug.trim() || isEditMode ? "manual" : "auto");
  const generatedSlug = useMemo(() => releaseSlugClientService.generateFromTitle(state.title), [state.title]);

  const handleTitleChange = (title: string) => {
    updateField("title", title);
    if (!isEditMode && slugMode === "auto") {
      updateField("slug", releaseSlugClientService.generateFromTitle(title));
    }
  };

  const handleSlugChange = (slug: string) => {
    setSlugMode("manual");
    updateField("slug", releaseSlugClientService.normalize(slug));
  };

  const regenerateSlug = () => {
    setSlugMode("auto");
    updateField("slug", generatedSlug);
  };

  return (
    <AdminReleaseFormSection title="Release Identity" description="Core routing and identity fields for this song release.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Title" htmlFor="release-title" error={validation.errors.title} required>
          <TextInput
            id="release-title"
            value={state.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="Firefly Instructions"
            required
          />
        </FieldShell>
        <FieldShell label="Slug" htmlFor="release-slug" error={validation.errors.slug} help="Lowercase, hyphen-separated, and stable for /songs routes.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              id="release-slug"
              value={state.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="firefly-instructions"
            />
            <button
              type="button"
              onClick={regenerateSlug}
              disabled={!generatedSlug}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/78 transition hover:border-anm-electric/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Regenerate
            </button>
          </div>
          <p className="mt-2 text-xs text-white/45">
            {slugMode === "auto" && !isEditMode ? "Slug follows the release title until manually edited." : "Manual slug edits are preserved."}
          </p>
        </FieldShell>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Song ID" htmlFor="release-song-id" help="Optional. Generated from slug if left blank on create.">
          <TextInput id="release-song-id" value={state.songId} onChange={(event) => updateField("songId", event.target.value)} />
        </FieldShell>
        {isEditMode ? (
          <FieldShell label="Release ID" htmlFor="release-id" help="Readonly after creation.">
            <TextInput id="release-id" value={state.releaseId ?? ""} readOnly className="cursor-not-allowed text-white/58" />
          </FieldShell>
        ) : null}
      </div>
    </AdminReleaseFormSection>
  );
}
