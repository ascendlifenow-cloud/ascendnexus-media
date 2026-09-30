import { ArrowLeft } from "lucide-react";
import { LinkButton } from "./ui/LinkButton";

export function BackToArtistsCTA() {
  return (
    <section className="bg-anm-purple-glow py-16">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Explore the full Ascend Nexus Media roster
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70">
          Move between persona worlds, styles, and catalogs from the public artist directory.
        </p>
        <LinkButton
          to="/artists"
          variant="primary"
          size="lg"
          className="mt-8"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Artists
        </LinkButton>
      </div>
    </section>
  );
}
