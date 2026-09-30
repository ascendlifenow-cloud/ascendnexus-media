import { ArrowRight, Disc3 } from "lucide-react";
import { Link } from "react-router-dom";

export function ExploreReleasesCTA() {
  return (
    <section className="border-t border-white/10 bg-[linear-gradient(135deg,#111522,#271b32_54%,#3a2415)] py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-amberGlow">
            <Disc3 className="h-4 w-4" aria-hidden="true" />
            Latest Music
          </div>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Hear the newest Ascend Nexus releases</h2>
          <p className="mt-3 text-base leading-7 text-white/68">
            Jump from the roster into the latest published songs from active AI Persona Artists.
          </p>
        </div>
        <Link
          to="/#latest-releases"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-bold text-ink transition hover:bg-cyanGlow focus:outline-none focus:ring-2 focus:ring-cyanGlow/60"
        >
          View Latest Releases
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
