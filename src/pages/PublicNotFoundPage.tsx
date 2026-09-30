import { Compass, Home, Music2, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicErrorState } from "../components/fallback";
import { SEOHead } from "../components/SEOHead";
import { routeSeoMetadata } from "../utils/seoMetadata";

export function PublicNotFoundPage() {
  return (
    <main className="min-h-screen bg-anm-page-gradient px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <SEOHead metadata={routeSeoMetadata.notFound} />
      <PublicErrorState
        errorCode="404"
        title="Page Not Found"
        message="The page you are looking for does not exist or may have moved."
        primaryAction={{ label: "Explore Artists", to: "/artists", icon: <UsersRound className="h-4 w-4" aria-hidden="true" /> }}
        secondaryAction={{ label: "Go Home", to: "/", icon: <Home className="h-4 w-4" aria-hidden="true" />, variant: "glass" }}
      />
      <div className="mx-auto mt-5 flex max-w-4xl justify-center">
        <Link
          to="/songs"
          className="anm-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.055] px-4 text-sm font-bold text-white/76 transition hover:border-anm-gold/35 hover:text-white"
        >
          <Music2 className="h-4 w-4" aria-hidden="true" />
          Browse Releases
        </Link>
      </div>
      <p className="mx-auto mt-8 flex max-w-4xl items-center justify-center gap-2 text-center text-sm text-white/48">
        <Compass className="h-4 w-4 text-anm-blue" aria-hidden="true" />
        The public navigation above can also guide you back into the catalog.
      </p>
    </main>
  );
}
