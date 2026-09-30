import type { HomepageContent, HomepageSectionConfig } from "../../models/homepage";
import { getHomepageSectionComponent } from "./homepageSectionRegistry";

interface HomepageSectionRendererProps {
  section: HomepageSectionConfig;
  content: HomepageContent;
}

export function HomepageSectionRenderer({ section, content }: HomepageSectionRendererProps) {
  if (!section.enabled) return null;

  const SectionComponent = getHomepageSectionComponent(section.sectionType);

  if (!SectionComponent) {
    if (import.meta.env.DEV) {
      console.warn(`Unsupported homepage section type skipped: ${section.sectionType}`);
    }
    return null;
  }

  return <SectionComponent section={section} content={content} />;
}
