import { X } from "lucide-react";
import type { AdminMetadataRecord } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { AdminSectionCard } from "../AdminSectionCard";
import { AdminMetadataStatusBadge } from "./AdminMetadataStatusBadge";
import { AdminNoIndexBadge } from "./AdminNoIndexBadge";
import { formatMetadataEntityType } from "../../utils/adminMetadataUtils";

interface AdminMetadataPreviewPanelProps {
  record: AdminMetadataRecord | null;
  onClose: () => void;
}

export function AdminMetadataPreviewPanel({ record, onClose }: AdminMetadataPreviewPanelProps) {
  if (!record) {
    return (
      <AdminSectionCard title="Metadata Detail Preview" description="Select View on a metadata record to inspect SEO and social preview details.">
        <div className="rounded-md border border-dashed border-white/12 bg-black/20 p-6 text-sm text-white/52">
          No metadata record selected.
        </div>
      </AdminSectionCard>
    );
  }

  return (
    <AdminSectionCard title="Metadata Detail Preview" description="This panel is ready for future SEO and social metadata editor workflows.">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <AdminMetadataStatusBadge status={record.status} />
            <AdminNoIndexBadge noIndex={record.noIndex} />
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-white">{record.entityLabel}</h3>
          <p className="mt-2 text-sm text-white/58">{formatMetadataEntityType(record.entityType)} / {record.publicPath || "Missing path"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close metadata preview">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">SEO Title</dt>
          <dd className="mt-1 text-white/76">{record.seoMetadata?.title || "Missing SEO title"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Canonical Path</dt>
          <dd className="mt-1 break-all text-white/76">{record.seoMetadata?.canonicalPath || record.publicPath || "Missing canonical path"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3 md:col-span-2">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">SEO Description</dt>
          <dd className="mt-1 text-white/76">{record.seoMetadata?.description || "Missing SEO description"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">SEO Image</dt>
          <dd className="mt-1 break-all text-white/76">{record.seoMetadata?.imageUrl || "Missing SEO image"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Image Alt</dt>
          <dd className="mt-1 text-white/76">{record.seoMetadata?.imageAlt || record.socialMetadata?.imageAlt || "Missing image alt text"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Social Title</dt>
          <dd className="mt-1 text-white/76">{record.socialMetadata?.title || "Missing social title"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Social Image</dt>
          <dd className="mt-1 break-all text-white/76">{record.socialMetadata?.imageUrl || "Missing social image"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Open Graph Type</dt>
          <dd className="mt-1 text-white/76">{record.socialMetadata?.type || record.seoMetadata?.type || "website"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Twitter Card</dt>
          <dd className="mt-1 text-white/76">{record.socialMetadata?.twitterCard || "summary_large_image"}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-white/42">Raw Metadata Preview</p>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/64">
          {JSON.stringify(record, null, 2)}
        </pre>
      </div>
    </AdminSectionCard>
  );
}
