import { Music2, UsersRound } from "lucide-react";
import { PublicErrorState } from "./fallback/PublicErrorState";

export function SongUnavailableState() {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <PublicErrorState
        title="Song Not Found"
        message="This Ascend Nexus Media release is unavailable or has not been published yet."
        primaryAction={{ label: "View Latest Releases", to: "/songs", icon: <Music2 className="h-4 w-4" aria-hidden="true" /> }}
        secondaryAction={{ label: "Explore Artists", to: "/artists", icon: <UsersRound className="h-4 w-4" aria-hidden="true" />, variant: "glass" }}
      />
    </section>
  );
}
