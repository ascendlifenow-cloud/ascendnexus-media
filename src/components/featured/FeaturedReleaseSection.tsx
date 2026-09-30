import type { FeaturedReleaseItem } from "../../models/homepage";
import { SectionContainer } from "../layout/SectionContainer";
import { FeaturedReleaseHeroPanel } from "./FeaturedReleaseHeroPanel";

interface FeaturedReleaseSectionProps {
  featuredRelease?: FeaturedReleaseItem;
}

export function FeaturedReleaseSection({ featuredRelease }: FeaturedReleaseSectionProps) {
  if (!featuredRelease) return null;

  return (
    <SectionContainer
      id="featured-release"
      className="bg-night py-16 sm:py-20"
      innerClassName="space-y-8"
      aria-labelledby="featured-release-heading"
    >
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Featured Release</p>
        <h2 id="featured-release-heading" className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Start with the signal in front
        </h2>
      </div>
      <FeaturedReleaseHeroPanel item={featuredRelease} />
    </SectionContainer>
  );
}
