import { Eye, ShieldAlert } from "lucide-react";
import type { AdminPreviewEntityType, AdminPreviewReadiness } from "../../utils/adminPreviewUtils";
import { PreviewBackActions } from "./PreviewBackActions";

interface AdminPreviewBannerProps {
  entityType: AdminPreviewEntityType;
  entityLabel: string;
  readiness: AdminPreviewReadiness;
  backTo: string;
  backLabel?: string;
}

const entityTypeLabels: Record<AdminPreviewEntityType, string> = {
  artist: "Artist",
  release: "Release",
  gallery: "Gallery Item",
  homepage: "Homepage",
  metadata: "Metadata",
};

export function AdminPreviewBanner({
  entityType,
  entityLabel,
  readiness,
  backTo,
  backLabel,
}: AdminPreviewBannerProps) {
  const notPublic = readiness.status.publicVisibility !== "public";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#150d23]/95 backdrop-blur-xl" role="banner">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-anm-gold">
            <Eye className="h-4 w-4" aria-hidden />
            Preview Mode
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            {entityTypeLabels[entityType]} Preview: {entityLabel}
          </h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-white/68">
            {notPublic ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-anm-pink" aria-hidden /> : null}
            {notPublic ? "This content is not publicly visible." : "This saved content has a public-safe route."}
          </p>
        </div>
        <PreviewBackActions
          backTo={backTo}
          backLabel={backLabel}
          publicLink={readiness.publicLink}
          publicSafe={readiness.publicSafe}
        />
      </div>
    </header>
  );
}
