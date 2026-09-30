import type { MetadataPreviewModel } from "../../../utils/adminMetadataFormUtils";
import { Badge } from "../../../../components/ui/Badge";

export function AdminSocialPreviewCard({ preview }: { preview: MetadataPreviewModel }) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-black/24">
      <img src={preview.imageUrl} alt={preview.imageAlt} className="aspect-[1.91/1] w-full object-cover" />
      <div className="grid gap-2 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">{preview.siteName}</p>
        <h3 className="text-lg font-semibold text-white">{preview.socialTitle}</h3>
        <p className="text-sm leading-6 text-white/62">{preview.socialDescription}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="glass">{preview.socialType}</Badge>
          <Badge variant="neutral">{preview.twitterCard}</Badge>
          {preview.noIndex ? <Badge variant="sunrise">No Index</Badge> : null}
        </div>
      </div>
    </div>
  );
}
