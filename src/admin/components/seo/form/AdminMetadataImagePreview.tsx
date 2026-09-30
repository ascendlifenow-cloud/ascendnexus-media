import type { MetadataPreviewModel } from "../../../utils/adminMetadataFormUtils";
import { FormSection } from "./AdminMetadataFormControls";

export function AdminMetadataImagePreview({ preview }: { preview: MetadataPreviewModel }) {
  return (
    <FormSection title="Preview Image" description="Uses social image, SEO image, entity fallback, then default Ascend Nexus Media image.">
      <div className="overflow-hidden rounded-md border border-white/10 bg-black/20">
        <img src={preview.imageUrl} alt={preview.imageAlt} className="aspect-[1.91/1] w-full object-cover" />
      </div>
      <p className="text-sm text-white/58">Image state: {preview.imageState.replace(/_/g, " ")}</p>
    </FormSection>
  );
}
