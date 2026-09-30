import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import type { ContactExploreLink } from "../../models/contact";
import { SectionContainer } from "../layout/SectionContainer";
import { Card } from "../ui/Card";

interface ExploreMoreCardsProps {
  links: ContactExploreLink[];
}

export function ExploreMoreCards({ links }: ExploreMoreCardsProps) {
  const visibleLinks = links.filter((link) => link.enabled);

  if (!visibleLinks.length) return null;

  return (
    <SectionContainer className="bg-night py-12 pb-24 sm:py-16 sm:pb-28" aria-labelledby="explore-more-heading">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Explore More</p>
        <h2 id="explore-more-heading" className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Keep moving through the catalog
        </h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {visibleLinks.map((link) => (
          <Card key={link.href} as="article" interactive className="p-5">
            <div className="grid h-11 w-11 place-items-center rounded-md border border-white/14 bg-black/22">
              <Compass className="h-5 w-5 text-amberGlow" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{link.label}</h3>
            <p className="mt-3 min-h-20 text-sm leading-6 text-white/62">{link.description}</p>
            <Link
              to={link.href}
              className="anm-focus mt-5 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-bold text-white/78 transition hover:text-white"
            >
              Open
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </div>
    </SectionContainer>
  );
}
