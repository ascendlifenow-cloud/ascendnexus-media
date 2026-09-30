import type { PublicSiteConfigSection } from "../../../models/admin";
import { getHomepageSectionPublicStatus } from "../../utils/adminHomepageUtils";
import { PublicVisibilityBadge } from "../publishing";

interface AdminHomepageVisibilityStateProps {
  section: PublicSiteConfigSection;
}

export function AdminHomepageVisibilityState({ section }: AdminHomepageVisibilityStateProps) {
  const status = getHomepageSectionPublicStatus(section);
  return <PublicVisibilityBadge visibility={status === "needs_setup" ? "needs_setup" : status === "hidden" ? "hidden" : "public"} />;
}
