import { Badge } from "./ui/Badge";
import { CTAGlowBackground } from "./CTAGlowBackground";
import { CTAButtonGroup, type CTAButtonConfig } from "./CTAButtonGroup";
import { SectionContainer } from "./layout/SectionContainer";

interface ExploreArtistsCTAContent {
  eyebrow?: string;
  headline: string;
  body: string;
  primaryCta?: CTAButtonConfig;
  secondaryCta?: CTAButtonConfig;
}

const exploreArtistsCtaContent: ExploreArtistsCTAContent = {
  eyebrow: "Explore the Roster",
  headline: "Meet the voices of Ascend Nexus Media.",
  body: "Discover AI Persona Artists with unique sounds, stories, visuals, and creative identities.",
  primaryCta: {
    label: "Explore Artists",
    to: "/artists",
    ariaLabel: "Explore all Ascend Nexus Media artists",
    variant: "primary",
  },
  secondaryCta: {
    label: "Listen to Latest Releases",
    to: "/#latest-releases",
    ariaLabel: "Jump to the latest Ascend Nexus Media releases",
    variant: "glass",
  },
};

export function ExploreArtistsCTA({ content = exploreArtistsCtaContent }: { content?: ExploreArtistsCTAContent }) {
  return (
    <SectionContainer className="bg-anm-bg py-16 sm:py-20" aria-labelledby="explore-artists-cta-heading">
      <div className="relative overflow-hidden rounded-anm-panel border border-white/10 bg-anm-surface-glass px-5 py-14 text-center shadow-anm-card-glow backdrop-blur-xl sm:px-8 sm:py-16 lg:px-16 lg:py-20">
        <CTAGlowBackground />
        <div className="relative mx-auto max-w-4xl">
          {content.eyebrow ? (
            <Badge variant="sunrise" className="uppercase tracking-[0.18em]">
              {content.eyebrow}
            </Badge>
          ) : null}
          <h2 id="explore-artists-cta-heading" className="mx-auto mt-5 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            {content.headline}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
            {content.body}
          </p>
          <CTAButtonGroup primary={content.primaryCta} secondary={content.secondaryCta} />
        </div>
      </div>
    </SectionContainer>
  );
}
