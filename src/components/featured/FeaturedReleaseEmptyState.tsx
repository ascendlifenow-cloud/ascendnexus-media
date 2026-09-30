import { EmptyState } from "../EmptyState";

export function FeaturedReleaseEmptyState() {
  return (
    <EmptyState
      title="No featured release is available"
      message="Published releases will appear here when a feature is selected."
    />
  );
}
