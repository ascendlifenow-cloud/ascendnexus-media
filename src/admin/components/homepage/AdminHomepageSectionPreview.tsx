import { X } from "lucide-react";
import type { PublicSiteConfigSection } from "../../../models/admin";
import { Button } from "../../../components/ui/Button";
import { AdminSectionCard } from "../AdminSectionCard";
import { AdminHomepageVisibilityState } from "./AdminHomepageVisibilityState";
import { AdminSectionTypeBadge } from "./AdminSectionTypeBadge";
import {
  getHomepageSectionMissingDataLabels,
  getHomepageSectionSubtitle,
  getHomepageSectionTitle,
} from "../../utils/adminHomepageUtils";

interface AdminHomepageSectionPreviewProps {
  section: PublicSiteConfigSection | null;
  onClose: () => void;
}

export function AdminHomepageSectionPreview({ section, onClose }: AdminHomepageSectionPreviewProps) {
  if (!section) {
    return (
      <AdminSectionCard
        title="Section Preview Foundation"
        description="Select Preview on a homepage section to inspect its configuration and public readiness."
      >
        <div className="rounded-md border border-dashed border-white/12 bg-black/20 p-6 text-sm text-white/52">
          No homepage section selected.
        </div>
      </AdminSectionCard>
    );
  }

  const missingLabels = getHomepageSectionMissingDataLabels(section);

  return (
    <AdminSectionCard title="Section Preview Foundation" description="This panel is ready for future visual preview and section editor workflows.">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <AdminSectionTypeBadge sectionType={section.sectionType} />
            <AdminHomepageVisibilityState section={section} />
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-white">{getHomepageSectionTitle(section)}</h3>
          <p className="mt-2 text-sm leading-6 text-white/58">{getHomepageSectionSubtitle(section)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close homepage section preview">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Section ID</dt>
          <dd className="mt-1 break-all text-white/76">{section.sectionId || "Missing section ID"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Section Type</dt>
          <dd className="mt-1 text-white/76">{section.sectionType}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Enabled</dt>
          <dd className="mt-1 text-white/76">{section.enabled ? "Enabled" : "Disabled"}</dd>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <dt className="text-xs uppercase tracking-[0.16em] text-white/42">Sort Order</dt>
          <dd className="mt-1 text-white/76">{section.sortOrder}</dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Configuration JSON</p>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/64">
            {JSON.stringify(section.configuration ?? {}, null, 2)}
          </pre>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Metadata Preview</p>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-white/64">
            {JSON.stringify(section.metadata ?? { missingData: missingLabels }, null, 2)}
          </pre>
        </div>
      </div>
    </AdminSectionCard>
  );
}
