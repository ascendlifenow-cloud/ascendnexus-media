import type { ReactNode } from "react";
import { SEOHead } from "../../../components/SEOHead";
import type { AdminPreviewEntityType, AdminPreviewReadiness } from "../../utils/adminPreviewUtils";
import { AdminPreviewBanner } from "./AdminPreviewBanner";

interface AdminPreviewLayoutProps {
  entityType: AdminPreviewEntityType;
  entityLabel: string;
  readiness: AdminPreviewReadiness;
  backTo: string;
  backLabel?: string;
  children: ReactNode;
}

const previewMetadata = {
  title: "Preview | Admin | Ascend Nexus Media",
  description: "Admin-only Ascend Nexus Media preview mode.",
  type: "custom" as const,
  noIndex: true,
};

export function AdminPreviewLayout({
  entityType,
  entityLabel,
  readiness,
  backTo,
  backLabel,
  children,
}: AdminPreviewLayoutProps) {
  return (
    <div className="min-h-screen bg-[#080611] text-white">
      <SEOHead metadata={previewMetadata} disableSocial />
      <AdminPreviewBanner
        entityType={entityType}
        entityLabel={entityLabel}
        readiness={readiness}
        backTo={backTo}
        backLabel={backLabel}
      />
      <main className="bg-ink" aria-label="Admin preview content">
        {children}
      </main>
    </div>
  );
}
