import { ArrowRight } from "lucide-react";
import { SectionContainer } from "../layout/SectionContainer";
import { Card } from "../ui/Card";
import { LinkButton } from "../ui/LinkButton";

export function ReleasesCatalogCTA() {
  return (
    <SectionContainer className="bg-night py-16 sm:py-20" aria-labelledby="releases-catalog-cta-heading">
      <Card className="border-white/12 bg-white/[0.055] p-6 text-center sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Artist Roster</p>
        <h2 id="releases-catalog-cta-heading" className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Discover the artists behind the music.
        </h2>
        <div className="mt-7 flex justify-center">
          <LinkButton to="/artists" size="lg">
            Explore Artists
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
        </div>
      </Card>
    </SectionContainer>
  );
}
