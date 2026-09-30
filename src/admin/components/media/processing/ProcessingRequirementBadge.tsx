import { Badge } from "../../../../components/ui/Badge";

export function ProcessingRequirementBadge({ state }: { state: "required" | "optional" | "unknown" }) {
  const variant = state === "required" ? "pink" : state === "optional" ? "glass" : "neutral";
  return <Badge variant={variant}>{state === "unknown" ? "Unknown" : state[0].toUpperCase() + state.slice(1)}</Badge>;
}
