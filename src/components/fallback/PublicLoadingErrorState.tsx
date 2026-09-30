import { Home, UsersRound } from "lucide-react";
import { PublicErrorState } from "./PublicErrorState";

interface PublicLoadingErrorStateProps {
  headingLevel?: "h1" | "h2";
  className?: string;
}

export function PublicLoadingErrorState({ headingLevel = "h2", className }: PublicLoadingErrorStateProps) {
  return (
    <PublicErrorState
      title="Unable to load content"
      message="Please try again or explore another section of Ascend Nexus Media."
      primaryAction={{ label: "Go Home", to: "/", icon: <Home className="h-4 w-4" aria-hidden="true" /> }}
      secondaryAction={{ label: "Explore Artists", to: "/artists", icon: <UsersRound className="h-4 w-4" aria-hidden="true" />, variant: "glass" }}
      headingLevel={headingLevel}
      className={className}
    />
  );
}
