import { EmptyState } from "../EmptyState";
import { ExploreArtistsCTA } from "../ExploreArtistsCTA";
import { SectionLoadingSkeleton } from "../loading";
import type { HomepageContent } from "../../models/homepage";
import { useHomepageConfig } from "../../hooks/useHomepageConfig";
import { HomepageSectionRenderer } from "./HomepageSectionRenderer";

interface ConfiguredHomepageProps {
  content: HomepageContent;
}

export function ConfiguredHomepage({ content }: ConfiguredHomepageProps) {
  const { data: sections = [], isLoading, isError } = useHomepageConfig();

  if (isLoading) {
    return (
      <section className="bg-night py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionLoadingSkeleton rows={2} cards={4} />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="bg-night py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <EmptyState title="Homepage configuration could not load" message="Please refresh the page to try again." />
        </div>
      </section>
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <section className="bg-night py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <EmptyState
              title="Ascend Nexus Media is preparing the homepage"
              message="Explore the active artist roster while the homepage configuration is updated."
            />
          </div>
        </section>
        <ExploreArtistsCTA />
      </>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <HomepageSectionRenderer key={section.sectionId} section={section} content={content} />
      ))}
    </>
  );
}
