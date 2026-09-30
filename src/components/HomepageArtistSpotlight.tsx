import { ArrowRight } from "lucide-react";
import type { ArtistSpotlightItem } from "../models/homepage";
import { ArtistSpotlightEmptyState } from "./ArtistSpotlightEmptyState";
import { ArtistSpotlightGrid } from "./ArtistSpotlightGrid";
import { ArtistSpotlightHeader } from "./ArtistSpotlightHeader";
import { SectionContainer } from "./layout/SectionContainer";
import { LinkButton } from "./ui/LinkButton";

interface HomepageArtistSpotlightProps {
  items: ArtistSpotlightItem[];
}

export function HomepageArtistSpotlight({ items }: HomepageArtistSpotlightProps) {
  return (
    <SectionContainer className="bg-ink py-20 sm:py-24" innerClassName="relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-anm-pink/35 to-transparent" aria-hidden="true" />
      <ArtistSpotlightHeader />
      {items.length > 0 ? <ArtistSpotlightGrid items={items} /> : <ArtistSpotlightEmptyState />}
      <div className="mt-10 flex justify-center lg:hidden">
        <LinkButton to="/artists" variant="glass">
          View All Artists
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      </div>
    </SectionContainer>
  );
}
