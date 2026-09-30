import { ArrowRight } from "lucide-react";
import { LinkButton } from "./ui/LinkButton";

export function ArtistSpotlightHeader() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyanGlow">Featured Artists</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-5xl">Artist Spotlight</h2>
        <p className="mt-4 text-base leading-7 text-white/66">
          Meet the AI Persona Artists shaping the sound of Ascend Nexus Media.
        </p>
      </div>
      <LinkButton to="/artists" variant="glass" className="hidden shrink-0 lg:inline-flex">
        View All Artists
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LinkButton>
    </div>
  );
}
