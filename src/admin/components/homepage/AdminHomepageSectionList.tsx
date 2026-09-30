import type { PublicSiteConfigSection } from "../../../models/admin";
import { AdminHomepageSectionRow } from "./AdminHomepageSectionRow";

interface AdminHomepageSectionListProps {
  sections: readonly PublicSiteConfigSection[];
  selectedSectionId?: string | null;
  onSelectSection: (section: PublicSiteConfigSection) => void;
  onOpenSection: (section: PublicSiteConfigSection) => void;
}

export function AdminHomepageSectionList({
  sections,
  selectedSectionId,
  onSelectSection,
  onOpenSection,
}: AdminHomepageSectionListProps) {
  return (
    <section className="overflow-hidden rounded-anm-panel border border-white/10 bg-anm-surface-glass shadow-anm-card-glow" aria-labelledby="admin-homepage-sections-heading">
      <div className="border-b border-white/10 px-4 py-4">
        <h2 id="admin-homepage-sections-heading" className="text-xl font-semibold text-white">
          Homepage Sections
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] border-collapse text-left">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-white/44">
            <tr>
              <th scope="col" className="px-4 py-3">Section</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Enabled</th>
              <th scope="col" className="px-4 py-3">Sort Order</th>
              <th scope="col" className="px-4 py-3">Public Status</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <AdminHomepageSectionRow
                key={section.sectionId}
                section={section}
                selected={selectedSectionId === section.sectionId}
                onSelect={onSelectSection}
                onOpen={onOpenSection}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
