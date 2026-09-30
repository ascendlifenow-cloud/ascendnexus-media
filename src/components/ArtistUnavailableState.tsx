import { UsersRound } from "lucide-react";
import { PublicErrorState } from "./fallback/PublicErrorState";

export function ArtistUnavailableState() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <PublicErrorState
        title="Artist Not Found"
        message="This Ascend Nexus Media artist is unavailable or has not been published yet."
        primaryAction={{ label: "View All Artists", to: "/artists", icon: <UsersRound className="h-4 w-4" aria-hidden="true" /> }}
      />
    </section>
  );
}
