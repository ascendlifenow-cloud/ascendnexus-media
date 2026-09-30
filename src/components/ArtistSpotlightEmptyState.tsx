import { ArrowRight } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { LinkButton } from "./ui/LinkButton";

export function ArtistSpotlightEmptyState() {
  return (
    <div className="mt-10">
      <EmptyState
        title="Artists are being prepared for the spotlight"
        message="The Ascend Nexus roster will appear here as public artist profiles become available."
      />
      <div className="mt-6 flex justify-center">
        <LinkButton to="/artists" variant="glass">
          Explore Artists
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      </div>
    </div>
  );
}
