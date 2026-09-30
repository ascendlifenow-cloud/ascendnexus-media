import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { PublicErrorState } from "../../components/fallback";
import { PublicPageLoader } from "../../components/loading";
import { Badge } from "../../components/ui/Badge";
import { AdminSearchPreviewCard, AdminSocialPreviewCard } from "../components/seo/form";
import { AdminPreviewLayout, PreviewReadinessPanel } from "../components/preview";
import { useMetadataPreview } from "../hooks/useAdminPreview";
import { buildMetadataPreviewModel, createMetadataFormState } from "../utils/adminMetadataFormUtils";

export function AdminMetadataPreviewPage() {
  const { metadataRecordId } = useParams();
  const previewQuery = useMetadataPreview(metadataRecordId);
  const preview = previewQuery.data?.ok ? previewQuery.data.data : undefined;
  const metadataPreview = useMemo(() => {
    if (!preview) return undefined;
    return buildMetadataPreviewModel(createMetadataFormState(preview.record), preview.record);
  }, [preview]);

  if (previewQuery.isLoading) return <PublicPageLoader />;
  if (!preview || !metadataPreview) {
    return <PublicErrorState title="Metadata preview unavailable" message="This saved metadata record could not be loaded." />;
  }

  return (
    <AdminPreviewLayout
      entityType="metadata"
      entityLabel={preview.record.entityLabel}
      readiness={preview.readiness}
      backTo={`/admin/seo/${preview.record.metadataRecordId}/edit`}
      backLabel="Back to Metadata"
    >
      <section className="bg-anm-page-gradient py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8">
          <div className="grid gap-5">
            <div>
              <p className="anm-eyebrow">SEO and Social Preview</p>
              <h2 className="mt-3 text-4xl font-semibold text-white">{preview.record.entityLabel}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="glass">{preview.record.entityType}</Badge>
                <Badge variant={preview.record.noIndex ? "sunrise" : "neutral"}>{preview.record.noIndex ? "No Index" : "Indexable"}</Badge>
                <Badge variant="neutral">{preview.record.status}</Badge>
              </div>
            </div>
            <AdminSearchPreviewCard preview={metadataPreview} />
            <AdminSocialPreviewCard preview={metadataPreview} />
            <div className="rounded-md border border-white/10 bg-black/24 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Raw Metadata Summary</p>
              <dl className="mt-4 grid gap-3 text-sm text-white/68 md:grid-cols-2">
                <div>
                  <dt className="text-white/42">Public path</dt>
                  <dd className="mt-1 text-white">{preview.record.publicPath ?? "Unavailable"}</dd>
                </div>
                <div>
                  <dt className="text-white/42">Missing fields</dt>
                  <dd className="mt-1 text-white">{preview.record.missingFields.length ? preview.record.missingFields.join(", ") : "None"}</dd>
                </div>
                <div>
                  <dt className="text-white/42">SEO title</dt>
                  <dd className="mt-1 text-white">{preview.record.seoMetadata?.title ?? "Generated fallback"}</dd>
                </div>
                <div>
                  <dt className="text-white/42">Social title</dt>
                  <dd className="mt-1 text-white">{preview.record.socialMetadata?.title ?? "Generated fallback"}</dd>
                </div>
              </dl>
            </div>
          </div>
          <PreviewReadinessPanel readiness={preview.readiness} />
        </div>
      </section>
    </AdminPreviewLayout>
  );
}
