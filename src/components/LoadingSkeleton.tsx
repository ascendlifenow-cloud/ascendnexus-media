import { GridSkeleton } from "./loading/GridSkeleton";

export function LoadingSkeleton() {
  return <GridSkeleton itemCount={6} variant="song" columns="md:grid-cols-3" />;
}
