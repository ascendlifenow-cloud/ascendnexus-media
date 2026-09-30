import type { MetadataPreviewModel } from "../../../utils/adminMetadataFormUtils";
import { FormSection } from "./AdminMetadataFormControls";
import { AdminSearchPreviewCard } from "./AdminSearchPreviewCard";
import { AdminSocialPreviewCard } from "./AdminSocialPreviewCard";

export function AdminMetadataPreviewPanel({ preview }: { preview: MetadataPreviewModel }) {
  return (
    <FormSection title="Preview Panel" description="Approximate search and social preview output with raw metadata summary.">
      <AdminSearchPreviewCard preview={preview} />
      <AdminSocialPreviewCard preview={preview} />
      <div className="rounded-md border border-white/10 bg-black/24 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Raw Metadata Summary</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div><dt className="text-white/42">og:title</dt><dd className="text-white/76">{preview.socialTitle}</dd></div>
          <div><dt className="text-white/42">og:description</dt><dd className="text-white/76">{preview.socialDescription}</dd></div>
          <div><dt className="text-white/42">og:image</dt><dd className="break-all text-white/76">{preview.imageUrl}</dd></div>
          <div><dt className="text-white/42">twitter:card</dt><dd className="text-white/76">{preview.twitterCard}</dd></div>
          <div><dt className="text-white/42">noIndex</dt><dd className="text-white/76">{String(preview.noIndex)}</dd></div>
        </dl>
      </div>
    </FormSection>
  );
}
