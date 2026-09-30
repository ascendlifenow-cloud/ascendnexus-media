import type { PublicSiteConfigSection } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { AdminHomepageVisibilityState } from "./AdminHomepageVisibilityState";
import { AdminSectionTypeBadge } from "./AdminSectionTypeBadge";
import {
  getHomepageSectionMissingDataLabels,
  getHomepageSectionSubtitle,
  getHomepageSectionTitle,
} from "../../utils/adminHomepageUtils";

interface AdminHomepageSectionRowProps {
  section: PublicSiteConfigSection;
  selected?: boolean;
  onSelect: (section: PublicSiteConfigSection) => void;
  onOpen: (section: PublicSiteConfigSection) => void;
}

export function AdminHomepageSectionRow({
  section,
  selected = false,
  onSelect,
  onOpen,
}: AdminHomepageSectionRowProps) {
  const missingLabels = getHomepageSectionMissingDataLabels(section);

  return (
    <tr
      className={[
        "cursor-pointer border-t border-white/10 align-top transition duration-200",
        selected
          ? "translate-y-[-1px] bg-anm-pink/10 shadow-[inset_3px_0_0_rgba(255,77,157,0.85),0_18px_42px_rgba(0,0,0,0.22)]"
          : "hover:bg-white/[0.035]",
      ].join(" ")}
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(section)}
      onDoubleClick={() => onOpen(section)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(section);
        if (event.key === " ") {
          event.preventDefault();
          onSelect(section);
        }
      }}
    >
      <td className="min-w-80 px-4 py-4">
        <p className="font-semibold text-white">{getHomepageSectionTitle(section)}</p>
        <p className="mt-1 line-clamp-2 max-w-md text-sm leading-6 text-white/56">{getHomepageSectionSubtitle(section)}</p>
        <p className="mt-1 text-xs text-white/38">{section.sectionId || "Missing section ID"}</p>
        {missingLabels.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {missingLabels.map((label) => (
              <Badge key={label} variant="neutral" className="px-2 py-1 text-[0.68rem]">
                Missing {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <AdminSectionTypeBadge sectionType={section.sectionType} />
      </td>
      <td className="px-4 py-4 text-sm font-semibold">
        <span className={section.enabled ? "text-anm-success" : "text-white/42"}>{section.enabled ? "Enabled" : "Disabled"}</span>
      </td>
      <td className="px-4 py-4 text-sm text-white/64">{section.sortOrder}</td>
      <td className="px-4 py-4">
        <AdminHomepageVisibilityState section={section} />
      </td>
    </tr>
  );
}
