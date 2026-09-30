import { ArrowRight, Disc3, Orbit, Sparkles } from "lucide-react";
import { SectionContainer } from "./layout/SectionContainer";
import { AboutFeatureCard } from "./AboutFeatureCard";
import { AboutVisualPanel } from "./AboutVisualPanel";
import { LinkButton } from "./ui/LinkButton";

const aboutContent = {
  eyebrow: "About Ascend Nexus Media",
  headline: "A new home for AI Persona Artists.",
  body:
    "Ascend Nexus Media is a creative music platform for AI Persona Artists, original songs, cover art, visual storytelling, and evolving digital music experiences.",
  support:
    "Each artist has a unique identity, sound, visual language, and creative direction within the Ascend Nexus ecosystem.",
  ctas: [
    { label: "Explore Artists", to: "/artists", variant: "primary" as const },
    { label: "Latest Releases", to: "/#latest-releases", variant: "glass" as const },
  ],
  features: [
    {
      icon: Sparkles,
      title: "AI Persona Artists",
      description: "Original digital artists with unique voices, stories, styles, and evolving creative identities.",
    },
    {
      icon: Disc3,
      title: "Original Music & Visuals",
      description:
        "Songs, cover art, videos, storyboards, and media assets designed as part of a connected creative universe.",
    },
    {
      icon: Orbit,
      title: "Ascend Nexus Ecosystem",
      description:
        "A growing creative platform connected to future tools for media production, artist management, storytelling, and digital experiences.",
    },
  ],
};

export function AboutAscendNexusMediaSection() {
  return (
    <SectionContainer
      id="about"
      className="scroll-mt-24 bg-night py-20 sm:py-24"
      innerClassName="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
      aria-labelledby="about-ascend-nexus-media-heading"
    >
      <div>
        <p className="anm-eyebrow">{aboutContent.eyebrow}</p>
        <h2 id="about-ascend-nexus-media-heading" className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-5xl">
          {aboutContent.headline}
        </h2>
        <p className="mt-6 text-base leading-7 text-white/70">{aboutContent.body}</p>
        <p className="mt-4 text-base leading-7 text-white/62">{aboutContent.support}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {aboutContent.ctas.map((cta) => (
            <LinkButton key={cta.to} to={cta.to} variant={cta.variant}>
              {cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </LinkButton>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        <AboutVisualPanel />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {aboutContent.features.map((feature) => (
            <AboutFeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}

export function AboutSection() {
  return <AboutAscendNexusMediaSection />;
}
