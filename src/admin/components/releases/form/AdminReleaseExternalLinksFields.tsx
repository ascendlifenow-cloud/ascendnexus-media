import type { ReleaseExternalLinks } from "../../../../models/release";
import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { releaseExternalLinkLabels } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseExternalLinksFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  updateExternalLink: (platform: keyof ReleaseExternalLinks, value: string) => void;
}

const platforms = Object.keys(releaseExternalLinkLabels) as Array<keyof ReleaseExternalLinks>;

export function AdminReleaseExternalLinksFields({ state, validation, updateExternalLink }: AdminReleaseExternalLinksFieldsProps) {
  return (
    <AdminReleaseFormSection title="External Links" description="Streaming, social, and custom release links. Empty rows stay hidden publicly.">
      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform, index) => (
          <FieldShell
            key={platform}
            label={`${releaseExternalLinkLabels[platform]} Link`}
            htmlFor={`release-link-${platform}`}
            error={validation.errors[`externalLinks.${platform}`]}
            help={`Enabled by URL. Sort order: ${index + 1}.`}
          >
            <TextInput
              id={`release-link-${platform}`}
              value={state.externalLinks[platform]}
              onChange={(event) => updateExternalLink(platform, event.target.value)}
              placeholder="https://"
            />
          </FieldShell>
        ))}
      </div>
    </AdminReleaseFormSection>
  );
}
