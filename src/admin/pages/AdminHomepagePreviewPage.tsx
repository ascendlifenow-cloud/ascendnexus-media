import { EyeOff } from "lucide-react";
import { HomepageSectionRenderer } from "../../components/homepage/HomepageSectionRenderer";
import { PublicErrorState } from "../../components/fallback";
import { PublicPageLoader } from "../../components/loading";
import { AdminPreviewLayout, PreviewReadinessPanel } from "../components/preview";
import { useHomepagePreview } from "../hooks/useAdminPreview";

export function AdminHomepagePreviewPage() {
  const previewQuery = useHomepagePreview();
  const preview = previewQuery.data?.ok ? previewQuery.data.data : undefined;

  if (previewQuery.isLoading) return <PublicPageLoader />;
  if (!preview) {
    return <PublicErrorState title="Homepage preview unavailable" message="The admin homepage configuration could not be loaded." />;
  }

  return (
    <AdminPreviewLayout
      entityType="homepage"
      entityLabel={preview.siteConfig.siteName}
      readiness={preview.readiness}
      backTo="/admin/homepage"
      backLabel="Back to Homepage"
    >
      <section className="border-b border-white/10 bg-[#10091b] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PreviewReadinessPanel readiness={preview.readiness} />
        </div>
      </section>
      {preview.sections.map((section) => (
        <div key={section.sectionId} className="relative">
          {!section.enabled ? (
            <div className="border-y border-anm-gold/25 bg-anm-gold/10 px-4 py-3 text-sm font-semibold text-anm-gold sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-7xl items-center gap-2">
                <EyeOff className="h-4 w-4" aria-hidden />
                Disabled section shown in admin preview only: {section.sectionId}
              </div>
            </div>
          ) : null}
          <HomepageSectionRenderer section={{ ...section, enabled: true }} content={preview.content} />
        </div>
      ))}
    </AdminPreviewLayout>
  );
}
