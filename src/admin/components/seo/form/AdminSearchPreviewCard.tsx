import type { MetadataPreviewModel } from "../../../utils/adminMetadataFormUtils";

export function AdminSearchPreviewCard({ preview }: { preview: MetadataPreviewModel }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/24 p-4">
      <p className="truncate text-sm text-anm-success">{preview.publicPath}</p>
      <h3 className="mt-1 text-lg font-semibold text-cyanGlow">{preview.searchTitle}</h3>
      <p className="mt-2 text-sm leading-6 text-white/64">{preview.searchDescription}</p>
    </div>
  );
}
