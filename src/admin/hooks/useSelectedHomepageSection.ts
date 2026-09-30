import { useState } from "react";
import type { PublicSiteConfigSection } from "../../models/admin";

export function useSelectedHomepageSection() {
  const [selectedSection, setSelectedSection] = useState<PublicSiteConfigSection | null>(null);

  return {
    selectedSection,
    selectSection: setSelectedSection,
    clearSelectedSection: () => setSelectedSection(null),
  };
}
