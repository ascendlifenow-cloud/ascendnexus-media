import { useParams } from "react-router-dom";
import { GalleryItemCard } from "../../components/gallery";
import { PublicErrorState } from "../../components/fallback";
import { PublicPageLoader } from "../../components/loading";
import { AdminPreviewLayout, PreviewReadinessPanel } from "../components/preview";
import { useGalleryPreview } from "../hooks/useAdminPreview";

export function AdminGalleryPreviewPage() {
  const { galleryItemId } = useParams();
  const previewQuery = useGalleryPreview(galleryItemId);
  const preview = previewQuery.data?.ok ? previewQuery.data.data : undefined;

  if (previewQuery.isLoading) return <PublicPageLoader />;
  if (!preview) {
    return <PublicErrorState title="Gallery preview unavailable" message="This saved admin gallery item could not be loaded." />;
  }

  return (
    <AdminPreviewLayout
      entityType="gallery"
      entityLabel={preview.item.title}
      readiness={preview.readiness}
      backTo={`/admin/gallery/${preview.item.galleryItemId}/edit`}
      backLabel="Back to Gallery Item"
    >
      <section className="bg-anm-page-gradient py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_24rem] lg:px-8">
          <div>
            <p className="anm-eyebrow">Gallery Item Preview</p>
            <h2 className="mt-3 text-4xl font-semibold text-white">{preview.item.title}</h2>
            {preview.item.description ? <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">{preview.item.description}</p> : null}
            <div className="mt-8 max-w-md">
              <GalleryItemCard item={preview.previewItem} />
            </div>
          </div>
          <PreviewReadinessPanel readiness={preview.readiness} />
        </div>
      </section>
    </AdminPreviewLayout>
  );
}
