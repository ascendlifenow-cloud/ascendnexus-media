import type { HomepageSectionType } from "../../../models/admin";
import { Badge } from "../../../components/ui/Badge";
import { formatHomepageSectionType } from "../../utils/adminHomepageUtils";

interface AdminSectionTypeBadgeProps {
  sectionType: HomepageSectionType;
}

export function AdminSectionTypeBadge({ sectionType }: AdminSectionTypeBadgeProps) {
  const variant = sectionType === "hero" ? "sunrise" : sectionType === "custom" ? "neutral" : "purple";
  return <Badge variant={variant}>{formatHomepageSectionType(sectionType)}</Badge>;
}
